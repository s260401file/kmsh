using IBM.Data.Db2;

namespace DbSync;

/// <summary>
/// 唯讀：向來源 DB2 的系統目錄查詢每張(啟用)表的主鍵/唯一索引欄位，
/// 供校正 appsettings 的 KeyCols（因目標 dump 多半沒宣告 PK，靠猜不準）。
/// 執行：DbSync.exe --inspect-keys
/// </summary>
public static class KeyInspector
{
    public static void Run(AppConfig cfg, Logger log)
    {
        const string sql = @"
SELECT i.INDNAME, i.UNIQUERULE, ic.COLNAME, ic.COLSEQ
FROM SYSCAT.INDEXES i
JOIN SYSCAT.INDEXCOLUSE ic ON ic.INDSCHEMA = i.INDSCHEMA AND ic.INDNAME = i.INDNAME
WHERE i.UNIQUERULE IN ('P','U') AND i.TABSCHEMA = ? AND i.TABNAME = ?
ORDER BY i.UNIQUERULE, i.INDNAME, ic.COLSEQ";

        using var db2 = new DB2Connection(cfg.Db2ConnectionString);
        db2.Open();

        foreach (var t in cfg.Tables)   // 唯讀查詢，含未啟用表一次查齊
        {
            using var cmd = new DB2Command(sql, db2) { CommandTimeout = cfg.CommandTimeoutSeconds };
            cmd.Parameters.Add(new DB2Parameter("@s", t.Schema));
            cmd.Parameters.Add(new DB2Parameter("@n", t.Name));

            var cols = new Dictionary<string, List<string>>();
            var rule = new Dictionary<string, char>();
            using (var r = cmd.ExecuteReader())
            {
                while (r.Read())
                {
                    var ind = r.GetString(0).Trim();
                    if (!cols.ContainsKey(ind)) { cols[ind] = new(); rule[ind] = r.GetString(1).Trim()[0]; }
                    cols[ind].Add(r.GetString(2).Trim());
                }
            }

            if (cols.Count == 0)
                log.Warn($"{t.Key}｜DB2 無宣告 PK/唯一索引（此表需改用 replace-by-key 或另定唯一鍵）");
            else
                foreach (var kv in cols)
                    log.Info($"{t.Key}｜{(rule[kv.Key] == 'P' ? "PK    " : "UNIQUE")} {kv.Key}: {string.Join(" + ", kv.Value)}");
        }
    }
}
