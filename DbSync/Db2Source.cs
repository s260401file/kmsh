using System.Data;
using IBM.Data.Db2;

namespace DbSync;

// ═══════════════════════════════════════════════════════════════════════════
// Db2Source.cs — 來源端(真實 DB2 / 高榮 HIS)的「讀取」封裝
// ---------------------------------------------------------------------------
// 只負責產生 SELECT 並回傳 IDataReader；由 SqlTarget.BulkCopy 邊讀邊灌入目標暫存表。
// 三個 DB2 眉角(維護時務必注意)：
//   • 欄名用雙引號 " " 限定：DB2 對「未加引號」的識別字會自動轉大寫，
//     若目標欄名是混合大小寫會對不上，故一律引用以保持與目標一致(見 ColList)。
//   • 增量條件靠「Z* 欄」：HIS 每張表有一個記錄「該列最後異動時間」的欄位(命名多為 Z 開頭)，
//     即 appsettings 的 WatermarkCol；WHERE Z* > ? 就能只撈上次之後變動的資料。
//   • CommandBehavior.SequentialAccess：叫 reader 逐列「串流」而非整包載入記憶體，
//     大表也不會吃爆記憶體(配合 SqlBulkCopy 的 BatchSize)。
// 參數一律用 DB2Parameter 綁定(? 佔位)，不字串拼接 → 防 SQL Injection、型別正確。
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>來源端（DB2）讀取：以 Z* 浮水印撈增量，或全表撈取。回傳 DataReader 供 SqlBulkCopy 串流。</summary>
public sealed class Db2Source
{
    private readonly DB2Connection _conn;
    private readonly int _timeout;

    public Db2Source(DB2Connection conn, int commandTimeoutSeconds)
    {
        _conn = conn;
        _timeout = commandTimeoutSeconds;
    }

    /// <summary>增量：SELECT ... WHERE {wmCol} &gt; ? [AND filter] ORDER BY {wmCol}。</summary>
    public IDataReader QueryChanges(string schema, string name, IReadOnlyList<string> cols, string wmCol, DateTime since, string? filter)
    {
        var where = $"\"{wmCol}\" > ?" + (string.IsNullOrWhiteSpace(filter) ? "" : $" AND ({filter})");
        var sql = $"SELECT {ColList(cols)} FROM {schema}.{name} WHERE {where} ORDER BY \"{wmCol}\"";
        var cmd = new DB2Command(sql, _conn) { CommandTimeout = _timeout };
        cmd.Parameters.Add(new DB2Parameter("@wm", since));
        return cmd.ExecuteReader(CommandBehavior.SequentialAccess);
    }

    /// <summary>全量（full 模式）：SELECT ... [WHERE filter]。</summary>
    public IDataReader QueryAll(string schema, string name, IReadOnlyList<string> cols, string? filter)
    {
        var where = string.IsNullOrWhiteSpace(filter) ? "" : $" WHERE ({filter})";
        var sql = $"SELECT {ColList(cols)} FROM {schema}.{name}{where}";
        var cmd = new DB2Command(sql, _conn) { CommandTimeout = _timeout };
        return cmd.ExecuteReader(CommandBehavior.SequentialAccess);
    }

    /// <summary>
    /// replacekey 模式：撈出「任一列 Z* &gt; 浮水印」的整個 key 群組（含未變動的同群列），
    /// 供目標端整組刪除後重寫。以自我 EXISTS 展開群組，故無唯一鍵也正確。
    /// </summary>
    public IDataReader QueryChangedGroups(string schema, string name, IReadOnlyList<string> cols,
        IReadOnlyList<string> keyCols, string wmCol, DateTime since, string? filter)
    {
        var join = string.Join(" AND ", keyCols.Select(k => $"c.\"{k}\" = t.\"{k}\""));
        var outer = string.IsNullOrWhiteSpace(filter) ? "" : $"({filter}) AND ";
        var sql = $"SELECT {ColList(cols, "t")} FROM {schema}.{name} t " +
                  $"WHERE {outer}EXISTS (SELECT 1 FROM {schema}.{name} c WHERE {join} AND c.\"{wmCol}\" > ?)";
        var cmd = new DB2Command(sql, _conn) { CommandTimeout = _timeout };
        cmd.Parameters.Add(new DB2Parameter("@wm", since));
        return cmd.ExecuteReader(CommandBehavior.SequentialAccess);
    }

    // 以雙引號限定欄名，確保大小寫與目標一致（DB2 預設會將未引用識別字轉大寫）
    private static string ColList(IReadOnlyList<string> cols, string? alias = null)
    {
        var pfx = alias is null ? "" : alias + ".";
        return string.Join(", ", cols.Select(c => $"{pfx}\"{c}\""));
    }
}
