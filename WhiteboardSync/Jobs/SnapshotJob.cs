using System.Data;
using System.Text.Json;
using Microsoft.Data.SqlClient;

namespace WhiteboardSync.Jobs;

/// <summary>
/// 通用「快照」ETL：對 DB2_DUMP 跑某 endpoint 的 SQL，把結果整份序列化成 JSON 陣列
/// （每列＝{欄名:值}，欄名用 SQL 原輸出名），upsert 進本地 [dbo].[Sync_Snapshot]（以 Endpoint 為鍵）。
/// 抽取／序列化拋錯就不 upsert → 保留上一次快照（顯示端永遠有資料，只是舊一點）。
/// 白板 API 讀 Sync_Snapshot.Payload、還原成對應 DTO 供看板顯示，不再即時呼叫院方 Board_* API。
/// </summary>
public sealed class SnapshotJob : IEtlJob
{
    private readonly string _endpoint;
    private readonly string _group;
    private readonly string _sql;

    public SnapshotJob(string endpoint, string group, string sql)
    {
        _endpoint = endpoint;
        _group = group;
        _sql = sql;
    }

    public string Name => $"Snapshot:{_endpoint}";
    public string Group => _group;

    // 冪等建表（單一快照表，兼作 Sync_Meta）
    private const string EnsureTableSql = @"
IF OBJECT_ID(N'[dbo].[Sync_Snapshot]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Sync_Snapshot] (
        [Endpoint]   NVARCHAR(60)  NOT NULL,
        [Payload]    NVARCHAR(MAX) NULL,
        [RowCount]   INT           NOT NULL CONSTRAINT DF_SyncSnap_Rows DEFAULT(0),
        [SyncedAt]   DATETIME2(0)  NOT NULL CONSTRAINT DF_SyncSnap_At   DEFAULT(GETDATE()),
        [DurationMs] INT           NOT NULL CONSTRAINT DF_SyncSnap_Dur  DEFAULT(0),
        CONSTRAINT [PK_Sync_Snapshot] PRIMARY KEY CLUSTERED ([Endpoint])
    );
END";

    private const string UpsertSql = @"
MERGE [dbo].[Sync_Snapshot] AS T
USING (SELECT @Endpoint AS Endpoint) AS S ON (T.[Endpoint] = S.Endpoint)
WHEN MATCHED THEN UPDATE SET T.[Payload]=@Payload, T.[RowCount]=@RowCount, T.[SyncedAt]=GETDATE(), T.[DurationMs]=@DurationMs
WHEN NOT MATCHED THEN INSERT ([Endpoint],[Payload],[RowCount],[SyncedAt],[DurationMs])
     VALUES (@Endpoint, @Payload, @RowCount, GETDATE(), @DurationMs);";

    public void Run(SqlConnection src, SqlConnection dst, AppConfig cfg, Logger log)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();

        // 1) 抽取（來源 DB2_DUMP）→ 轉 JSON 陣列
        var (json, rows) = ExtractJson(src, cfg.CommandTimeoutSeconds);

        // 2) 冪等建表（目標本地 Whiteboard）
        using (var cmd = new SqlCommand(EnsureTableSql, dst) { CommandTimeout = cfg.CommandTimeoutSeconds })
            cmd.ExecuteNonQuery();

        // 3) upsert（抽取成功才會走到這；失敗會在 ExtractJson 拋出 → 保留上次快照）
        using (var cmd = new SqlCommand(UpsertSql, dst) { CommandTimeout = cfg.CommandTimeoutSeconds })
        {
            cmd.Parameters.AddWithValue("@Endpoint", _endpoint);
            cmd.Parameters.AddWithValue("@Payload", (object?)json ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@RowCount", rows);
            cmd.Parameters.AddWithValue("@DurationMs", (int)sw.ElapsedMilliseconds);
            cmd.ExecuteNonQuery();
        }

        log.Info($"{Name}｜{rows} 列、{json.Length} 字元、{sw.ElapsedMilliseconds} ms。");
    }

    // reader → JSON 陣列（每列一物件；欄名＝SQL 輸出名；值以字串為主，null→JSON null）
    private (string json, int rows) ExtractJson(SqlConnection src, int timeout)
    {
        using var cmd = new SqlCommand(_sql, src) { CommandTimeout = timeout };
        using var r = cmd.ExecuteReader();

        var cols = new string[r.FieldCount];
        for (int i = 0; i < r.FieldCount; i++) cols[i] = r.GetName(i);

        using var w = new Utf8JsonWriterWrap();
        int rows = 0;
        w.Writer.WriteStartArray();
        while (r.Read())
        {
            w.Writer.WriteStartObject();
            for (int i = 0; i < r.FieldCount; i++)
            {
                w.Writer.WritePropertyName(cols[i]);
                if (r.IsDBNull(i)) { w.Writer.WriteNullValue(); continue; }
                var v = r.GetValue(i);
                switch (v)
                {
                    case string s:    w.Writer.WriteStringValue(s); break;
                    case DateTime dt: w.Writer.WriteStringValue(dt.ToString("yyyy-MM-ddTHH:mm:ss")); break;
                    case bool b:      w.Writer.WriteStringValue(b ? "1" : "0"); break;
                    case byte[] by:   w.Writer.WriteStringValue(Convert.ToBase64String(by)); break;
                    default:          w.Writer.WriteStringValue(Convert.ToString(v, System.Globalization.CultureInfo.InvariantCulture) ?? ""); break;
                }
            }
            w.Writer.WriteEndObject();
            rows++;
        }
        w.Writer.WriteEndArray();
        w.Writer.Flush();
        return (w.GetString(), rows);
    }

    // 以 MemoryStream 承接 Utf8JsonWriter，最後轉 UTF-8 字串
    private sealed class Utf8JsonWriterWrap : IDisposable
    {
        private readonly MemoryStream _ms = new();
        public Utf8JsonWriter Writer { get; }
        public Utf8JsonWriterWrap()
        {
            Writer = new Utf8JsonWriter(_ms, new JsonWriterOptions { Indented = false });
        }
        public string GetString() { Writer.Flush(); return System.Text.Encoding.UTF8.GetString(_ms.ToArray()); }
        public void Dispose() { Writer.Dispose(); _ms.Dispose(); }
    }
}
