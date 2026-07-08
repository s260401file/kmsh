using IBM.Data.Db2;
using Microsoft.Data.SqlClient;

namespace DbSync;

// ═══════════════════════════════════════════════════════════════════════════
// TableSyncer.cs — 「單一表」的同步核心（本工具的心臟）
// ---------------------------------------------------------------------------
// 每張表都走同一套「暫存表(staging)」流程，確保原子性與資源完整釋放：
//   1. 開目標(SQL Server / DB2_DUMP)連線 → 讀該表欄位清單            GetColumns
//   2. 依目標表結構「重建」一張空的暫存表 dbo._stg_{schema}_{name}   RecreateStaging
//   3. 開來源(DB2)連線 → 依 Mode 撈資料，用 SqlBulkCopy「串流」灌進暫存表
//   4. 把暫存表的內容「套用」到正式目標表（MERGE / 整組替換），並推進浮水印
//   5. finally 一律 DropStaging，暫存表不殘留
//
// 為什麼要暫存表？來源是 DB2、目標是 SQL Server，無法用一句 SQL 跨庫 JOIN 比對；
// 先把來源資料落到「目標端的暫存表」，才能用目標端的 MERGE 做集合運算(比對/upsert/刪除)。
//
// 四種 Mode（在 appsettings.json 每表設定，於 Sync() 內分派；細節見各 Sync* 方法）：
//   replacekey  ── 首選。免唯一鍵。找出有異動的「案群組」，整組刪掉再以來源現況重寫。
//   incremental ── 需唯一 KeyCols。撈異動列，以鍵 upsert(有則更新/無則新增)。
//   append      ── 純新增表(如日誌類)。同 incremental 但只 INSERT、不更新既有列。
//   full        ── 全表對帳。整列雜湊比對 upsert，並刪掉來源已不存在的列。
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>單一表同步。每表獨立開/關兩端連線，確保失敗時資源完整釋放、且不影響其他表。</summary>
public sealed class TableSyncer
{
    private readonly AppConfig _cfg;
    private readonly WatermarkStore _wm;
    private readonly Logger _log;
    private readonly DateTime? _sinceOverride;   // --reprocess-hours：忽略浮水印，改從此時間點起（測試/回補用）

    public TableSyncer(AppConfig cfg, WatermarkStore wm, Logger log, DateTime? sinceOverride = null)
    {
        _cfg = cfg; _wm = wm; _log = log; _sinceOverride = sinceOverride;
    }

    // 決定「本輪從哪個時間點之後開始撈」(＝增量起點 since)。優先序由上而下：
    //   1. --reprocess-hours 覆寫值：強制重撈（測試/回補用），忽略浮水印
    //   2. 上次成功後存下的浮水印（state/watermarks-{tier}.json）
    //   3. 目標表現有的最大 Z* 值：首次執行、還沒有浮水印檔時用，避免第一次就整表重灌
    //   4. 以上皆無 → 1900/1/1（等同全撈）
    private DateTime SinceFor(TableSpec t, SqlTarget target)
        => _sinceOverride
           ?? _wm.Get(t.Key)
           ?? target.GetMaxWatermark(t.FullName, t.WatermarkCol!, t.Filter)
           ?? new DateTime(1900, 1, 1);

    /// <summary>同步一張表：準備暫存表 → 依 Mode 撈來源灌入 → 套用到目標 → 清暫存表。</summary>
    public void Sync(TableSpec t)
    {
        // 連線皆以 using 包覆：無論成功或例外，離開範圍即釋放（SQL 連線歸還連線池、DB2 連線關閉）
        using var sql = new SqlConnection(_cfg.SqlConnectionString);
        sql.Open();
        var target = new SqlTarget(sql, _cfg.CommandTimeoutSeconds);

        // 先做目標端準備（讀欄位、建 staging），再連來源開始串流。
        // 抽取欄位「以目標表為準」：目標有哪些欄位就撈哪些，避免來源多出的欄位灌不進去。
        var cols = target.GetColumns(t.Schema, t.Name);
        var stg = target.RecreateStaging(t.Schema, t.Name, t.FullName);
        try
        {
            using var db2 = new DB2Connection(_cfg.Db2ConnectionString);
            db2.Open();
            var source = new Db2Source(db2, _cfg.CommandTimeoutSeconds);

            // 依設定的 Mode 分派到對應同步策略（字串來自 appsettings.json 的 "Mode"）
            if (t.Mode is "incremental" or "append")
                SyncIncremental(t, cols, stg, source, target, insertOnly: t.Mode == "append");
            else if (t.Mode == "replacekey")
                SyncReplaceKey(t, cols, stg, source, target);
            else if (t.Mode == "full")
                SyncFull(t, cols, stg, source, target);
            else
                throw new InvalidOperationException($"未知 Mode：{t.Mode}");
        }
        finally
        {
            target.DropStaging(stg);   // 不論成功或例外，一律清掉暫存表，避免殘留佔空間
        }
    }

    // ── incremental / append ────────────────────────────────────────────────
    // 撈「Z* 浮水印之後」的異動列 → 灌暫存表 → 以 KeyCols 做 upsert。
    //   insertOnly=false(incremental)：命中鍵則 UPDATE、未命中則 INSERT。
    //   insertOnly=true (append)     ：只 INSERT（適合純新增、不回頭改的表，如日誌）。
    // 前提：KeyCols 必須是「唯一鍵」，否則 upsert 會對不準。這批 HIS 表多半無唯一鍵，
    //       故實務上改用 replacekey；此法保留給確有唯一鍵的表。
    private void SyncIncremental(TableSpec t, List<string> cols, string stg, Db2Source source, SqlTarget target, bool insertOnly)
    {
        if (string.IsNullOrWhiteSpace(t.WatermarkCol))
            throw new InvalidOperationException($"{t.Key} 為 {t.Mode} 模式但未設定 WatermarkCol。");

        var since = SinceFor(t, target);

        using (var reader = source.QueryChanges(t.Schema, t.Name, cols, t.WatermarkCol!, since, t.Filter))
            target.BulkCopy(reader, stg, cols);   // reader 於此 using 結束後釋放

        var changed = target.StagingCount(stg);
        if (changed == 0)
        {
            _log.Info($"{t.Key}｜自 {since:yyyy-MM-dd HH:mm:ss} 起無異動。");
            return;
        }

        var affected = target.MergeUpsert(t.FullName, stg, t.KeyCols, cols, insertOnly);
        var newMax = target.StagingMax(stg, t.WatermarkCol!);
        if (newMax.HasValue) _wm.Set(t.Key, newMax.Value);   // 推進浮水印（每表更新後立即持久化）

        _log.Info($"{t.Key}｜{(insertOnly ? "append" : "incremental")} 撈到 {changed} 筆、套用 {affected}，浮水印 → {newMax:yyyy-MM-dd HH:mm:ss.fff}。");
    }

    // ── replacekey（首選，免唯一鍵）────────────────────────────────────────────
    // 概念：HIS 一「筆案(案號)」常對應多列（如診斷、位置歷程），且 DB2 未宣告唯一鍵，
    //       無法逐列 upsert。改以「案群組鍵 KeyCols」為單位整組替換：
    //   1. 來源撈出「群組內任一列 Z* > 浮水印」的整個群組現況（含群組內未變動的列）
    //   2. 目標把這些群組「整組刪除」後，把來源現況原封寫回（同一交易，失敗全回復）
    //   → 結果：目標該群組 = 來源該群組，內容永遠一致，且不需要唯一鍵。
    // 限制：只處理「有異動的群組」；若整個案從來源消失(跨群組刪除)，增量偵測不到，
    //       需靠日後 slow 層全量對帳補上（見 README）。
    private void SyncReplaceKey(TableSpec t, List<string> cols, string stg, Db2Source source, SqlTarget target)
    {
        if (string.IsNullOrWhiteSpace(t.WatermarkCol))
            throw new InvalidOperationException($"{t.Key} 為 replacekey 模式但未設定 WatermarkCol。");
        if (t.KeyCols.Count == 0)
            throw new InvalidOperationException($"{t.Key} 為 replacekey 模式但未設定 KeyCols（案群組鍵）。");

        var since = SinceFor(t, target);

        // 撈「有異動的案」之完整現況（含同案未動列）
        using (var reader = source.QueryChangedGroups(t.Schema, t.Name, cols, t.KeyCols, t.WatermarkCol!, since, t.Filter))
            target.BulkCopy(reader, stg, cols);

        var n = target.StagingCount(stg);
        if (n == 0)
        {
            _log.Info($"{t.Key}｜自 {since:yyyy-MM-dd HH:mm:ss} 起無異動。");
            return;
        }

        var (deleted, inserted) = target.ReplaceGroups(t.FullName, stg, t.KeyCols, cols);   // 整組刪除後重寫（單一交易）
        var newMax = target.StagingMax(stg, t.WatermarkCol!);
        if (newMax.HasValue) _wm.Set(t.Key, newMax.Value);

        _log.Info($"{t.Key}｜replacekey 受影響案群組 {n} 列：刪除 {deleted}、寫入 {inserted}，浮水印 → {newMax:yyyy-MM-dd HH:mm:ss.fff}。");
    }

    // ── full（全量對帳）─────────────────────────────────────────────────────
    // 每輪把整張來源表拉進暫存表，與目標「整列雜湊比對」：異動則更新、來源新增則插入、
    // 來源已刪除(目標有但來源無)則刪除。最準但最重，適合小表或低頻(slow 層)對帳。
    // 需 KeyCols 對映列（此處用來配對 T/S，不強制唯一，但鍵不唯一時比對意義會失真）。
    private void SyncFull(TableSpec t, List<string> cols, string stg, Db2Source source, SqlTarget target)
    {
        using (var reader = source.QueryAll(t.Schema, t.Name, cols, t.Filter))
            target.BulkCopy(reader, stg, cols);

        var total = target.StagingCount(stg);
        var affected = target.MergeFull(t.FullName, stg, t.KeyCols, cols);
        _log.Info($"{t.Key}｜full 來源 {total} 筆，套用差異(含刪除) {affected}。");
    }
}
