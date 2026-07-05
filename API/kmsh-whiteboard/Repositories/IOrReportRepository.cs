using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>OR 報表：直接讀資訊室同步庫（DB2_DUMP）的 OPORDER_4A0，不經 Board_* API。</summary>
public interface IOrReportRepository
{
    /// <summary>取某期間 [from, to) 的 OR 手術清單＋統計。to 為排除上界。</summary>
    Task<OrMonthlyResult> GetMonthlyAsync(DateTime from, DateTime to, CancellationToken ct = default);
}
