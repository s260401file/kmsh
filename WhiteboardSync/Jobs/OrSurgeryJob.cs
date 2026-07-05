using System.Data;
using Microsoft.Data.SqlClient;

namespace WhiteboardSync.Jobs;

/// <summary>
/// OR 手術清單 ETL：讀 DB2_DUMP [OR].OPORDER_4A0（＋HPBASIC 姓名/生日、HLOC 病房床），
/// 清洗＋去重後以 staging＋MERGE 落地到本地 [dbo].[OrSurgery]。窗內來源已消失者刪除（反映取消）。
/// </summary>
public sealed class OrSurgeryJob : IEtlJob
{
    public string Name => "OrSurgery";

    // 清洗後要寫入的資料欄（順序＝DataTable/staging/MERGE 一致；不含 Id/IsActive/UpdatedAt/CreatedAt）
    private static readonly string[] Cols =
    {
        "OpDate","OpTime","Room","RoomId","CaseType","CaseTypeText","ChartNo","CaseNo",
        "PatientName","Sex","Age","SourceWard","SourceBed","SurgeonNo","SurgeonName","MentorName",
        "AssistantNames","SurgeryName","Anesthesia","NhiCodes","IcdCodes","StatusCode","CancelReason","EndDate","EndTime"
    };
    private static readonly string[] KeyCols = { "OpDate", "Room", "ChartNo", "OpTime" };

    // 冪等建表（單批，無 GO；與 schema_v23_or_surgery.sql 同義）
    private const string EnsureTableSql = @"
IF OBJECT_ID(N'[dbo].[OrSurgery]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OrSurgery] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [OpDate] DATE NOT NULL,
        [OpTime] NVARCHAR(10) NOT NULL CONSTRAINT DF_OrSurg_OpTime DEFAULT(''),
        [Room] NVARCHAR(10) NULL, [RoomId] NVARCHAR(20) NULL,
        [CaseType] NVARCHAR(2) NULL, [CaseTypeText] NVARCHAR(10) NULL,
        [ChartNo] NVARCHAR(20) NOT NULL, [CaseNo] NVARCHAR(20) NULL,
        [PatientName] NVARCHAR(50) NULL, [Sex] NVARCHAR(2) NULL, [Age] INT NULL,
        [SourceWard] NVARCHAR(20) NULL, [SourceBed] NVARCHAR(20) NULL,
        [SurgeonNo] NVARCHAR(20) NULL, [SurgeonName] NVARCHAR(50) NULL, [MentorName] NVARCHAR(50) NULL,
        [AssistantNames] NVARCHAR(500) NULL, [SurgeryName] NVARCHAR(200) NULL, [Anesthesia] NVARCHAR(20) NULL,
        [NhiCodes] NVARCHAR(200) NULL, [IcdCodes] NVARCHAR(200) NULL,
        [StatusCode] NVARCHAR(10) NULL, [CancelReason] NVARCHAR(400) NULL,
        [EndDate] DATE NULL, [EndTime] NVARCHAR(10) NULL,
        [IsActive] BIT NOT NULL CONSTRAINT DF_OrSurg_Active DEFAULT(1),
        [UpdatedAt] DATETIME2(0) NOT NULL CONSTRAINT DF_OrSurg_Updated DEFAULT(GETDATE()),
        [CreatedAt] DATETIME2(0) NOT NULL CONSTRAINT DF_OrSurg_Created DEFAULT(GETDATE()),
        CONSTRAINT [PK_OrSurgery] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_OrSurgery] UNIQUE ([OpDate],[Room],[ChartNo],[OpTime])
    );
    CREATE INDEX [IX_OrSurgery_Date_Room] ON [dbo].[OrSurgery] ([OpDate],[Room]);
END";

    // 抽取（來源 DB2_DUMP）：join 姓名/生日與最新病房床；多帶 CaseNo/DseqNo 供去重
    private const string ExtractSql = @"
SELECT
  o.ORBGNDT AS OpDate, CONVERT(varchar(5),o.ORBGNTM,108) AS OpTime,
  o.OROPROOM AS Room, o.ORCASETP AS CaseType, o.OROPAMED AS Anesthesia,
  o.ORHISNUM AS ChartNo, o.ORCASENO AS CaseNo,
  p.HNAMEC AS PatientName, p.HSEX AS Sex, TRY_CONVERT(date,p.HBIRTHDT) AS BirthDate,
  l.HNURSTA AS SourceWard, l.HBED AS SourceBed,
  o.ORDOCNO AS SurgeonNo, o.ORDOCNM AS SurgeonName, o.ORGUINM AS MentorName,
  o.ORADRNM1 AS A1, o.ORADRNM2 AS A2, o.ORADRNM3 AS A3, o.ORADRNM4 AS A4, o.ORADRNM5 AS A5,
  o.OROPNM1 AS SurgeryName,
  o.OROPNC1 AS N1, o.OROPNC2 AS N2, o.OROPNC3 AS N3, o.OROPNC4 AS N4,
  o.OROPICD1 AS D1, o.OROPICD2 AS D2, o.OROPICD3 AS D3, o.OROPICD4 AS D4,
  o.ORSTATUS AS StatusCode, o.ORREASON AS CancelReason,
  o.ORENDDT AS EndDate, CONVERT(varchar(5),o.ORENDTM,108) AS EndTime
FROM [OR].OPORDER_4A0 o
LEFT JOIN AM.HPBASIC_4A0 p ON LTRIM(RTRIM(p.HHISNUM))=LTRIM(RTRIM(o.ORHISNUM))
OUTER APPLY (SELECT TOP 1 h.HNURSTA, h.HBED FROM AM.HLOC_4A0 h
    WHERE LTRIM(RTRIM(h.HHISNUM))=LTRIM(RTRIM(o.ORHISNUM))
      AND LTRIM(RTRIM(h.HCASENO))=LTRIM(RTRIM(o.ORCASENO))
    ORDER BY h.HADATE DESC) l
WHERE o.ORBGNDT >= @windowStart
ORDER BY o.ORBGNDT, o.ORBGNTM, o.OROPROOM;";

    public void Run(SqlConnection src, SqlConnection dst, AppConfig cfg, Logger log)
    {
        var windowStart = DateTime.Today.AddMonths(-cfg.WindowMonthsBack);

        // 1) 冪等建表 ＋ 讀 OrRoom（ApiRoom→RoomId）
        Exec(dst, EnsureTableSql, cfg.CommandTimeoutSeconds);
        var roomMap = LoadRoomMap(dst, cfg.CommandTimeoutSeconds);

        // 2) 抽取 ＋ 3) 清洗
        var rows = Extract(src, windowStart, cfg.CommandTimeoutSeconds, roomMap);
        var fetched = rows.Count;

        // 4) 去重（自然鍵取一筆）
        var deduped = rows
            .GroupBy(r => ($"{r.OpDate:yyyy-MM-dd}|{r.Room}|{r.ChartNo}|{r.OpTime}"))
            .Select(g => g.First())
            .ToList();
        var dupRemoved = fetched - deduped.Count;

        // 5) staging ＋ bulk copy
        const string stg = "dbo.[_stg_OrSurgery]";
        var colList = string.Join(",", Cols.Select(c => $"[{c}]"));
        Exec(dst, $"IF OBJECT_ID('{stg}') IS NOT NULL DROP TABLE {stg}; SELECT TOP 0 {colList} INTO {stg} FROM [dbo].[OrSurgery];", cfg.CommandTimeoutSeconds);
        try
        {
            BulkCopy(dst, stg, deduped);

            // 6) MERGE（更新變動、插入新、窗內來源消失者刪除）
            var (ins, upd, del) = Merge(dst, stg, windowStart, cfg.CommandTimeoutSeconds);
            log.Info($"{Name}｜撈到 {fetched}、去重 -{dupRemoved} → {deduped.Count}；MERGE 新增 {ins}、更新 {upd}、刪除 {del}（窗 >= {windowStart:yyyy-MM-dd}）。");
        }
        finally
        {
            Exec(dst, $"IF OBJECT_ID('{stg}') IS NOT NULL DROP TABLE {stg};", cfg.CommandTimeoutSeconds);
        }
    }

    // ── 抽取＋清洗 ────────────────────────────────────────────────
    private static List<OrRow> Extract(SqlConnection src, DateTime windowStart, int timeout, IReadOnlyDictionary<string, string> roomMap)
    {
        var list = new List<OrRow>();
        using var cmd = new SqlCommand(ExtractSql, src) { CommandTimeout = timeout };
        cmd.Parameters.AddWithValue("@windowStart", windowStart);
        using var r = cmd.ExecuteReader();
        string? S(string col) { var i = r.GetOrdinal(col); return r.IsDBNull(i) ? null : r.GetValue(i)?.ToString(); }
        DateTime? D(string col) { var i = r.GetOrdinal(col); return r.IsDBNull(i) ? null : r.GetDateTime(i); }

        while (r.Read())
        {
            var opDate = D("OpDate") ?? DateTime.MinValue;
            var room = OrClean.C(S("Room")) ?? "";
            var caseType = OrClean.C(S("CaseType"));
            list.Add(new OrRow
            {
                OpDate = opDate,
                OpTime = OrClean.C(S("OpTime")) ?? "",
                Room = room,
                RoomId = roomMap.TryGetValue(room, out var rid) ? rid : null,
                CaseType = caseType,
                CaseTypeText = OrClean.CaseTypeText(caseType),
                ChartNo = OrClean.C(S("ChartNo")) ?? "",
                CaseNo = OrClean.C(S("CaseNo")),
                PatientName = OrClean.C(S("PatientName")),
                Sex = OrClean.C(S("Sex")),
                Age = OrClean.Age(D("BirthDate"), opDate),
                SourceWard = OrClean.C(S("SourceWard")),
                SourceBed = OrClean.C(S("SourceBed")),
                SurgeonNo = OrClean.C(S("SurgeonNo")),
                SurgeonName = OrClean.C(S("SurgeonName")),
                MentorName = OrClean.C(S("MentorName")),
                AssistantNames = OrClean.Join(S("A1"), S("A2"), S("A3"), S("A4"), S("A5")),
                SurgeryName = OrClean.C(S("SurgeryName")),
                Anesthesia = OrClean.C(S("Anesthesia")),
                NhiCodes = OrClean.Join(S("N1"), S("N2"), S("N3"), S("N4")),
                IcdCodes = OrClean.Join(S("D1"), S("D2"), S("D3"), S("D4")),
                StatusCode = OrClean.C(S("StatusCode")),
                CancelReason = OrClean.C(S("CancelReason")),
                EndDate = OrClean.CleanDate(D("EndDate")),
                EndTime = OrClean.C(S("EndTime")),
            });
        }
        return list;
    }

    private static Dictionary<string, string> LoadRoomMap(SqlConnection dst, int timeout)
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        using var cmd = new SqlCommand("SELECT ApiRoom, RoomId FROM dbo.OrRoom WHERE UnitCode='OR' AND ApiRoom IS NOT NULL", dst) { CommandTimeout = timeout };
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            var api = r.IsDBNull(0) ? null : r.GetString(0).Trim();
            var rid = r.IsDBNull(1) ? null : r.GetString(1).Trim();
            if (!string.IsNullOrEmpty(api) && !string.IsNullOrEmpty(rid)) map[api] = rid;
        }
        return map;
    }

    // ── 落地 ────────────────────────────────────────────────────
    private static void BulkCopy(SqlConnection dst, string stg, List<OrRow> rows)
    {
        var dt = new DataTable();
        dt.Columns.Add("OpDate", typeof(DateTime));
        dt.Columns.Add("OpTime", typeof(string));
        dt.Columns.Add("Room", typeof(string));
        dt.Columns.Add("RoomId", typeof(string));
        dt.Columns.Add("CaseType", typeof(string));
        dt.Columns.Add("CaseTypeText", typeof(string));
        dt.Columns.Add("ChartNo", typeof(string));
        dt.Columns.Add("CaseNo", typeof(string));
        dt.Columns.Add("PatientName", typeof(string));
        dt.Columns.Add("Sex", typeof(string));
        dt.Columns.Add("Age", typeof(int));
        dt.Columns.Add("SourceWard", typeof(string));
        dt.Columns.Add("SourceBed", typeof(string));
        dt.Columns.Add("SurgeonNo", typeof(string));
        dt.Columns.Add("SurgeonName", typeof(string));
        dt.Columns.Add("MentorName", typeof(string));
        dt.Columns.Add("AssistantNames", typeof(string));
        dt.Columns.Add("SurgeryName", typeof(string));
        dt.Columns.Add("Anesthesia", typeof(string));
        dt.Columns.Add("NhiCodes", typeof(string));
        dt.Columns.Add("IcdCodes", typeof(string));
        dt.Columns.Add("StatusCode", typeof(string));
        dt.Columns.Add("CancelReason", typeof(string));
        dt.Columns.Add("EndDate", typeof(DateTime));
        dt.Columns.Add("EndTime", typeof(string));

        foreach (var x in rows)
            dt.Rows.Add(
                x.OpDate, x.OpTime, x.Room, (object?)x.RoomId ?? DBNull.Value,
                (object?)x.CaseType ?? DBNull.Value, (object?)x.CaseTypeText ?? DBNull.Value,
                x.ChartNo, (object?)x.CaseNo ?? DBNull.Value,
                (object?)x.PatientName ?? DBNull.Value, (object?)x.Sex ?? DBNull.Value, (object?)x.Age ?? DBNull.Value,
                (object?)x.SourceWard ?? DBNull.Value, (object?)x.SourceBed ?? DBNull.Value,
                (object?)x.SurgeonNo ?? DBNull.Value, (object?)x.SurgeonName ?? DBNull.Value, (object?)x.MentorName ?? DBNull.Value,
                (object?)x.AssistantNames ?? DBNull.Value, (object?)x.SurgeryName ?? DBNull.Value, (object?)x.Anesthesia ?? DBNull.Value,
                (object?)x.NhiCodes ?? DBNull.Value, (object?)x.IcdCodes ?? DBNull.Value,
                (object?)x.StatusCode ?? DBNull.Value, (object?)x.CancelReason ?? DBNull.Value,
                (object?)x.EndDate ?? DBNull.Value, (object?)x.EndTime ?? DBNull.Value);

        using var bulk = new SqlBulkCopy(dst) { DestinationTableName = stg, BulkCopyTimeout = 0, BatchSize = 5000 };
        foreach (var c in Cols) bulk.ColumnMappings.Add(c, c);
        bulk.WriteToServer(dt);
    }

    // MERGE：更新變動(雜湊比對)、插入新、窗內來源消失者刪除。回 (inserted, updated, deleted)。
    private static (int ins, int upd, int del) Merge(SqlConnection dst, string stg, DateTime windowStart, int timeout)
    {
        var on = string.Join(" AND ", KeyCols.Select(k => $"T.[{k}]=S.[{k}]"));
        var nonKey = Cols.Where(c => !KeyCols.Contains(c)).ToList();
        string Hash(string a) => $"HASHBYTES('SHA2_256', CONCAT_WS('||', {string.Join(", ", nonKey.Select(c => $"CONVERT(nvarchar(max),{a}.[{c}])"))}))";
        var setList = string.Join(", ", nonKey.Select(c => $"T.[{c}]=S.[{c}]"));
        var insCols = string.Join(", ", Cols.Select(c => $"[{c}]"));
        var insVals = string.Join(", ", Cols.Select(c => $"S.[{c}]"));

        var sql = $@"
DECLARE @act TABLE(act nvarchar(10));
MERGE [dbo].[OrSurgery] AS T USING {stg} AS S ON ({on})
WHEN MATCHED AND {Hash("T")} <> {Hash("S")} THEN UPDATE SET {setList}, T.[UpdatedAt]=GETDATE()
WHEN NOT MATCHED BY TARGET THEN INSERT ({insCols}) VALUES ({insVals})
WHEN NOT MATCHED BY SOURCE AND T.[OpDate] >= @windowStart THEN DELETE
OUTPUT $action INTO @act;
SELECT
  SUM(CASE WHEN act='INSERT' THEN 1 ELSE 0 END),
  SUM(CASE WHEN act='UPDATE' THEN 1 ELSE 0 END),
  SUM(CASE WHEN act='DELETE' THEN 1 ELSE 0 END)
FROM @act;";

        using var cmd = new SqlCommand(sql, dst) { CommandTimeout = timeout };
        cmd.Parameters.AddWithValue("@windowStart", windowStart);
        using var r = cmd.ExecuteReader();
        r.Read();
        int G(int i) => r.IsDBNull(i) ? 0 : r.GetInt32(i);
        return (G(0), G(1), G(2));
    }

    private static void Exec(SqlConnection conn, string sql, int timeout)
    {
        using var cmd = new SqlCommand(sql, conn) { CommandTimeout = timeout };
        cmd.ExecuteNonQuery();
    }

    private sealed class OrRow
    {
        public DateTime OpDate; public string OpTime = ""; public string Room = ""; public string? RoomId;
        public string? CaseType; public string? CaseTypeText; public string ChartNo = ""; public string? CaseNo;
        public string? PatientName; public string? Sex; public int? Age; public string? SourceWard; public string? SourceBed;
        public string? SurgeonNo; public string? SurgeonName; public string? MentorName; public string? AssistantNames;
        public string? SurgeryName; public string? Anesthesia; public string? NhiCodes; public string? IcdCodes;
        public string? StatusCode; public string? CancelReason; public DateTime? EndDate; public string? EndTime;
    }
}
