using Dapper;
using kmsh_whiteboard.Data;
using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>
/// OR 報表：改讀「本地」清洗表 [dbo].[OrSurgery]（由 WhiteboardSync 定時自 DB2_DUMP OPORDER 清洗落地），
/// 不再於請求當下直連院方 DB2_DUMP → 院方/網路當下不通報表仍可出。
/// 注意：OrSurgery 已「清洗＋去重」(自然鍵 OpDate/Room/ChartNo/OpTime)，故台數為去重後(避免同案多術式列灌水)，
/// 與 OR 看板「手術清單」頁同源一致；抽取窗＝WhiteboardSync 的 WindowMonthsBack(預設 6 個月)，更舊月份需加大同步窗。
/// 統計於記憶體彙總（單月資料量小）。
/// </summary>
public class OrReportRepository : IOrReportRepository
{
    private readonly DbConnectionFactory _db;
    public OrReportRepository(DbConnectionFactory db) => _db = db;

    // 本地清洗表欄位已與 OrMonthlyRow 同名，Dapper 直接對映（值已清洗，免再 trim/合併/算年齡）。
    private const string Sql = @"
SELECT
  OpDate, OpTime, Room, CaseType, CaseTypeText, Anesthesia, ChartNo,
  PatientName, Sex, Age, SourceWard, SourceBed,
  SurgeonNo, SurgeonName, MentorName, AssistantNames, SurgeryName,
  NhiCodes, IcdCodes, StatusCode, CancelReason, EndDate, EndTime
FROM [dbo].[OrSurgery]
WHERE OpDate >= @from AND OpDate < @to
ORDER BY OpDate, OpTime, Room;";

    public async Task<OrMonthlyResult> GetMonthlyAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        using var conn = _db.Create();

        // 表尚未建立（首輪同步前）→ 回空結果，報表不中斷。
        var exists = await conn.ExecuteScalarAsync<int?>(
            new CommandDefinition("SELECT OBJECT_ID(N'dbo.OrSurgery', N'U')", cancellationToken: ct));
        var rows = exists is null
            ? new List<OrMonthlyRow>()
            : (await conn.QueryAsync<OrMonthlyRow>(new CommandDefinition(
                Sql, new { from, to }, cancellationToken: ct))).ToList();

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
}
