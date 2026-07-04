using kmsh_whiteboard.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

/// <summary>操作稽核查詢（僅系統管理員）。稽核寫入由全域 OperationAuditFilter 自動處理。</summary>
[ApiController]
[Route("api/[controller]")]
public class AuditController : ControllerBase
{
    private readonly IAuditRepository _audit;
    public AuditController(IAuditRepository audit) => _audit = audit;

    /// <summary>
    /// 查詢操作稽核：GET /api/Audit/operations?from=2026-07-01&amp;to=2026-07-05&amp;empNo=MB69&amp;page=1&amp;pageSize=50。
    /// to 為排除上界（查 7/4 一整天 → from=2026-07-04&amp;to=2026-07-05）。
    /// </summary>
    [HttpGet("operations")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetOperations(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? empNo,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);
        var (rows, total) = await _audit.GetOperationsAsync(from, to, empNo, page, pageSize, ct);
        return Ok(new { total, page, pageSize, rows });
    }
}
