using Dapper;
using kmsh_whiteboard.Data;
using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>
/// OR 報表：直接查資訊室同步庫 DB2_DUMP 的 [OR].OPORDER_4A0（手術醫令），
/// join AM.HPBASIC_4A0 取姓名/生日、AM.HLOC_4A0 取來源病房。不經 Board_* API。
/// 統計於記憶體彙總（單月資料量小）。
/// </summary>
public class OrReportRepository : IOrReportRepository
{
    private readonly DbConnectionFactory _db;
    public OrReportRepository(DbConnectionFactory db) => _db = db;

    // 明細查詢：欄位取原值，去空白/全形空白與多值合併於 C# 處理。
    // OUTER APPLY 取該案最新一筆 HLOC（避免床位歷程造成一對多放大）。
    private const string Sql = @"
SELECT
  o.ORBGNDT                     AS OpDate,
  CONVERT(varchar(5),o.ORBGNTM,108) AS OpTime,
  o.OROPROOM AS Room, o.ORCASETP AS CaseType, o.OROPAMED AS Anesthesia,
  o.ORHISNUM AS ChartNo, p.HNAMEC AS PatientName, p.HSEX AS Sex,
  TRY_CONVERT(date,p.HBIRTHDT)  AS BirthDate,
  l.HNURSTA AS SourceWard, l.HBED AS SourceBed,
  o.ORDOCNO AS SurgeonNo, o.ORDOCNM AS SurgeonName, o.ORGUINM AS MentorName,
  o.ORADRNM1 AS A1, o.ORADRNM2 AS A2, o.ORADRNM3 AS A3, o.ORADRNM4 AS A4, o.ORADRNM5 AS A5,
  o.OROPNM1 AS SurgeryName,
  o.OROPNC1 AS C1, o.OROPNC2 AS C2, o.OROPNC3 AS C3, o.OROPNC4 AS C4,
  o.OROPICD1 AS I1, o.OROPICD2 AS I2, o.OROPICD3 AS I3, o.OROPICD4 AS I4,
  o.ORSTATUS AS StatusCode, o.ORREASON AS CancelReason,
  o.ORENDDT AS EndDate, CONVERT(varchar(5),o.ORENDTM,108) AS EndTime
FROM [OR].OPORDER_4A0 o
LEFT JOIN AM.HPBASIC_4A0 p ON LTRIM(RTRIM(p.HHISNUM))=LTRIM(RTRIM(o.ORHISNUM))
OUTER APPLY (SELECT TOP 1 h.HNURSTA, h.HBED FROM AM.HLOC_4A0 h
    WHERE LTRIM(RTRIM(h.HHISNUM))=LTRIM(RTRIM(o.ORHISNUM))
      AND LTRIM(RTRIM(h.HCASENO))=LTRIM(RTRIM(o.ORCASENO))
    ORDER BY h.HADATE DESC) l
WHERE o.ORBGNDT >= @from AND o.ORBGNDT < @to
ORDER BY o.ORBGNDT, o.ORBGNTM, o.OROPROOM;";

    public async Task<OrMonthlyResult> GetMonthlyAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        using var conn = _db.CreateDump();
        var raw = (await conn.QueryAsync<OrRaw>(new CommandDefinition(
            Sql, new { from, to }, cancellationToken: ct))).ToList();

        var rows = raw.Select(r => new OrMonthlyRow
        {
            OpDate = r.OpDate,
            OpTime = C(r.OpTime),
            Room = C(r.Room),
            CaseType = C(r.CaseType),
            CaseTypeText = CaseTypeText(C(r.CaseType)),
            Anesthesia = C(r.Anesthesia),
            ChartNo = C(r.ChartNo),
            PatientName = C(r.PatientName),
            Sex = C(r.Sex),
            Age = Age(r.BirthDate, r.OpDate),
            SourceWard = C(r.SourceWard),
            SourceBed = C(r.SourceBed),
            SurgeonNo = C(r.SurgeonNo),
            SurgeonName = C(r.SurgeonName),
            MentorName = C(r.MentorName),
            AssistantNames = Join(r.A1, r.A2, r.A3, r.A4, r.A5),
            SurgeryName = C(r.SurgeryName),
            NhiCodes = Join(r.C1, r.C2, r.C3, r.C4),
            IcdCodes = Join(r.I1, r.I2, r.I3, r.I4),
            StatusCode = C(r.StatusCode),
            CancelReason = C(r.CancelReason),
            EndDate = r.EndDate,
            EndTime = C(r.EndTime),
        }).ToList();

        var stats = new OrMonthlyStats
        {
            Total = rows.Count,
            Inpatient = rows.Count(x => x.CaseType == "A"),
            Outpatient = rows.Count(x => x.CaseType == "O"),
            Emergency = rows.Count(x => x.CaseType == "E"),
            Status82 = rows.Count(x => x.StatusCode == "82"),
            ByRoom = rows.GroupBy(x => x.Room ?? "").OrderBy(g => g.Key)
                         .Select(g => new CodeCount { Key = g.Key, Count = g.Count() }).ToList(),
            ByAnesthesia = rows.GroupBy(x => x.Anesthesia ?? "").OrderByDescending(g => g.Count())
                         .Select(g => new CodeCount { Key = g.Key, Count = g.Count() }).ToList(),
            BySurgeon = rows.GroupBy(x => x.SurgeonName ?? "").OrderByDescending(g => g.Count()).Take(15)
                         .Select(g => new CodeCount { Key = g.Key, Count = g.Count() }).ToList(),
        };

        return new OrMonthlyResult
        {
            From = from.ToString("yyyy-MM-dd"),
            To = to.ToString("yyyy-MM-dd"),
            Stats = stats,
            Rows = rows,
        };
    }

    // 去頭尾空白（含全形空白 U+3000，.NET Trim() 視為空白）；全空→null
    private static string? C(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
    private static string? Join(params string?[] parts)
    {
        var vals = parts.Select(C).Where(v => v is not null);
        var s = string.Join("、", vals);
        return s.Length == 0 ? null : s;
    }
    private static string? CaseTypeText(string? c) => c switch { "A" => "住院", "O" => "門診", "E" => "急診", _ => c };
    private static int? Age(DateTime? birth, DateTime op)
    {
        if (birth is null) return null;
        var a = op.Year - birth.Value.Year;
        if (op < birth.Value.AddYears(a)) a--;
        return a >= 0 && a < 130 ? a : null;
    }

    // Dapper 承接原始欄位（未清洗）
    private sealed class OrRaw
    {
        public DateTime OpDate { get; set; }
        public string? OpTime { get; set; }
        public string? Room { get; set; }
        public string? CaseType { get; set; }
        public string? Anesthesia { get; set; }
        public string? ChartNo { get; set; }
        public string? PatientName { get; set; }
        public string? Sex { get; set; }
        public DateTime? BirthDate { get; set; }
        public string? SourceWard { get; set; }
        public string? SourceBed { get; set; }
        public string? SurgeonNo { get; set; }
        public string? SurgeonName { get; set; }
        public string? MentorName { get; set; }
        public string? A1 { get; set; } public string? A2 { get; set; } public string? A3 { get; set; }
        public string? A4 { get; set; } public string? A5 { get; set; }
        public string? SurgeryName { get; set; }
        public string? C1 { get; set; } public string? C2 { get; set; } public string? C3 { get; set; } public string? C4 { get; set; }
        public string? I1 { get; set; } public string? I2 { get; set; } public string? I3 { get; set; } public string? I4 { get; set; }
        public string? StatusCode { get; set; }
        public string? CancelReason { get; set; }
        public DateTime? EndDate { get; set; }
        public string? EndTime { get; set; }
    }
}
