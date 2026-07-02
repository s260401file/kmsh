using System.Data;
using Microsoft.Data.SqlClient;

namespace DbSync;

/// <summary>目標端（SQL Server / DB2_DUMP）操作：欄位查詢、staging、SqlBulkCopy、MERGE。</summary>
public sealed class SqlTarget
{
    private readonly SqlConnection _conn;
    private readonly int _timeout;

    public SqlTarget(SqlConnection conn, int commandTimeoutSeconds)
    {
        _conn = conn;
        _timeout = commandTimeoutSeconds;
    }

    /// <summary>取回目標表欄位（依序），做為抽取欄位與 staging 結構依據。</summary>
    public List<string> GetColumns(string schema, string name)
    {
        using var cmd = new SqlCommand(
            "SELECT c.name FROM sys.columns c WHERE c.object_id = OBJECT_ID(@t) ORDER BY c.column_id", _conn)
        { CommandTimeout = _timeout };
        cmd.Parameters.AddWithValue("@t", $"{schema}.{name}");
        var cols = new List<string>();
        using var r = cmd.ExecuteReader();
        while (r.Read()) cols.Add(r.GetString(0));
        if (cols.Count == 0) throw new InvalidOperationException($"目標找不到表 {schema}.{name} 或無欄位。");
        return cols;
    }

    /// <summary>目標現有的最大浮水印值（首次執行時用來初始化，避免第一次全量重灌）。</summary>
    public DateTime? GetMaxWatermark(string full, string col, string? filter)
    {
        var sql = $"SELECT MAX([{col}]) FROM {full}" + WhereOf(filter);
        using var cmd = new SqlCommand(sql, _conn) { CommandTimeout = _timeout };
        var o = cmd.ExecuteScalar();
        return o is null || o == DBNull.Value ? null : Convert.ToDateTime(o);
    }

    /// <summary>建立（重建）staging 表：dbo._stg_{schema}_{name}，結構複製自目標。</summary>
    public string RecreateStaging(string schema, string name, string full)
    {
        var stg = $"dbo.[_stg_{schema}_{name}]";
        Exec($"IF OBJECT_ID('{stg}') IS NOT NULL DROP TABLE {stg}; SELECT TOP 0 * INTO {stg} FROM {full};");
        return stg;
    }

    /// <summary>把來源 DataReader 串流灌進 staging（記憶體友善，不整包載入）。</summary>
    public void BulkCopy(IDataReader reader, string stg, IReadOnlyList<string> cols)
    {
        using var bulk = new SqlBulkCopy(_conn)
        {
            DestinationTableName = stg,
            BulkCopyTimeout = 0,   // 0 = 不限時（首次可能較久）
            BatchSize = 5000
        };
        foreach (var c in cols) bulk.ColumnMappings.Add(c, c);
        bulk.WriteToServer(reader);
    }

    /// <summary>incremental/append：以鍵 upsert（append 模式僅 INSERT，不更新既有列）。</summary>
    public int MergeUpsert(string full, string stg, IReadOnlyList<string> keys, IReadOnlyList<string> cols, bool insertOnly)
    {
        var on = string.Join(" AND ", keys.Select(k => $"T.[{k}]=S.[{k}]"));
        var nonKey = cols.Where(c => !keys.Contains(c, StringComparer.OrdinalIgnoreCase)).ToList();

        var matched = (!insertOnly && nonKey.Count > 0)
            ? $"WHEN MATCHED THEN UPDATE SET {string.Join(", ", nonKey.Select(c => $"T.[{c}]=S.[{c}]"))}\n"
            : "";
        var insCols = string.Join(", ", cols.Select(c => $"[{c}]"));
        var insVals = string.Join(", ", cols.Select(c => $"S.[{c}]"));

        var sql = $@"MERGE {full} AS T USING {stg} AS S ON ({on})
{matched}WHEN NOT MATCHED BY TARGET THEN INSERT ({insCols}) VALUES ({insVals});";
        return Exec(sql);
    }

    /// <summary>full：以整列雜湊比對做 upsert，並刪除來源已不存在的列（僅套用差異，不整批取代）。</summary>
    public int MergeFull(string full, string stg, IReadOnlyList<string> keys, IReadOnlyList<string> cols)
    {
        var on = string.Join(" AND ", keys.Select(k => $"T.[{k}]=S.[{k}]"));
        var nonKey = cols.Where(c => !keys.Contains(c, StringComparer.OrdinalIgnoreCase)).ToList();
        var insCols = string.Join(", ", cols.Select(c => $"[{c}]"));
        var insVals = string.Join(", ", cols.Select(c => $"S.[{c}]"));

        string matched;
        if (nonKey.Count > 0)
        {
            string Hash(string a) => $"HASHBYTES('SHA2_256', CONCAT_WS('||', {string.Join(", ", nonKey.Select(c => $"CONVERT(nvarchar(max),{a}.[{c}])"))}))";
            matched = $"WHEN MATCHED AND {Hash("T")} <> {Hash("S")} THEN UPDATE SET {string.Join(", ", nonKey.Select(c => $"T.[{c}]=S.[{c}]"))}\n";
        }
        else matched = "";

        var sql = $@"MERGE {full} AS T USING {stg} AS S ON ({on})
{matched}WHEN NOT MATCHED BY TARGET THEN INSERT ({insCols}) VALUES ({insVals})
WHEN NOT MATCHED BY SOURCE THEN DELETE;";
        return Exec(sql);
    }

    public int StagingCount(string stg)
    {
        using var cmd = new SqlCommand($"SELECT COUNT(*) FROM {stg}", _conn) { CommandTimeout = _timeout };
        return Convert.ToInt32(cmd.ExecuteScalar());
    }

    public DateTime? StagingMax(string stg, string col)
    {
        using var cmd = new SqlCommand($"SELECT MAX([{col}]) FROM {stg}", _conn) { CommandTimeout = _timeout };
        var o = cmd.ExecuteScalar();
        return o is null || o == DBNull.Value ? null : Convert.ToDateTime(o);
    }

    public void DropStaging(string stg) => Exec($"IF OBJECT_ID('{stg}') IS NOT NULL DROP TABLE {stg};");

    /// <summary>
    /// replacekey：在單一交易內，刪掉目標中「key 出現在 staging」的所有列，再把 staging 全部寫回。
    /// staging 內是來源「受影響 key 群組」的完整現況 → 目標該群組被替換成與來源一致（免唯一鍵）。
    /// </summary>
    public (int deleted, int inserted) ReplaceGroups(string full, string stg, IReadOnlyList<string> keys, IReadOnlyList<string> cols)
    {
        var on = string.Join(" AND ", keys.Select(k => $"T.[{k}]=S.[{k}]"));
        var colList = string.Join(", ", cols.Select(c => $"[{c}]"));
        using var tx = _conn.BeginTransaction();
        try
        {
            // 只刪「鍵出現在 staging（＝來源已備妥現況）」的案；刪除與寫入同一交易，失敗即整體回復
            int del = Exec($"DELETE T FROM {full} T WHERE EXISTS (SELECT 1 FROM {stg} S WHERE {on});", tx);
            int ins = Exec($"INSERT INTO {full} ({colList}) SELECT {colList} FROM {stg};", tx);
            tx.Commit();
            return (del, ins);
        }
        catch { tx.Rollback(); throw; }
    }

    private static string WhereOf(string? filter) => string.IsNullOrWhiteSpace(filter) ? "" : $" WHERE ({filter})";

    private int Exec(string sql, SqlTransaction? tx = null)
    {
        using var cmd = new SqlCommand(sql, _conn) { CommandTimeout = _timeout };
        if (tx != null) cmd.Transaction = tx;
        return cmd.ExecuteNonQuery();
    }
}
