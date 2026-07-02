using IBM.Data.Db2;
using Microsoft.Data.SqlClient;

namespace DbSync;

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

    // since = 覆寫值（若有）→ 已存浮水印 → 目標現有最大值 → 1900
    private DateTime SinceFor(TableSpec t, SqlTarget target)
        => _sinceOverride
           ?? _wm.Get(t.Key)
           ?? target.GetMaxWatermark(t.FullName, t.WatermarkCol!, t.Filter)
           ?? new DateTime(1900, 1, 1);

    public void Sync(TableSpec t)
    {
        // 連線皆以 using 包覆：無論成功或例外，離開範圍即釋放（連線歸還連線池、DB2 連線關閉）
        using var sql = new SqlConnection(_cfg.SqlConnectionString);
        sql.Open();
        var target = new SqlTarget(sql, _cfg.CommandTimeoutSeconds);

        // 先做目標端準備（讀欄位、建 staging），再連來源開始串流
        var cols = target.GetColumns(t.Schema, t.Name);
        var stg = target.RecreateStaging(t.Schema, t.Name, t.FullName);
        try
        {
            using var db2 = new DB2Connection(_cfg.Db2ConnectionString);
            db2.Open();
            var source = new Db2Source(db2, _cfg.CommandTimeoutSeconds);

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
            target.DropStaging(stg);   // 一律清掉暫存表，避免殘留
        }
    }

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

    private void SyncFull(TableSpec t, List<string> cols, string stg, Db2Source source, SqlTarget target)
    {
        using (var reader = source.QueryAll(t.Schema, t.Name, cols, t.Filter))
            target.BulkCopy(reader, stg, cols);

        var total = target.StagingCount(stg);
        var affected = target.MergeFull(t.FullName, stg, t.KeyCols, cols);
        _log.Info($"{t.Key}｜full 來源 {total} 筆，套用差異(含刪除) {affected}。");
    }
}
