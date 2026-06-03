using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PatientController : ControllerBase
{
    private readonly IVghksApiService _vghksApi;

    public PatientController(IVghksApiService vghksApi) => _vghksApi = vghksApi;

    /// <summary>查詢急診病人詳細資料</summary>
    [HttpGet("er")]
    public async Task<IActionResult> GetERPat(
        [FromQuery] string hhisnum,
        [FromQuery] string hcaseno,
        [FromQuery] string? hnursta,
        [FromQuery] string? hbedno,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(hhisnum) || string.IsNullOrWhiteSpace(hcaseno))
            return BadRequest(new { message = "hhisnum 與 hcaseno 為必填" });

        var result = await _vghksApi.GetERPatAsync(hhisnum, hcaseno, hnursta, hbedno, ct);
        return Ok(result);
    }

    /// <summary>查詢住院病人詳細資料</summary>
    [HttpGet("am")]
    public async Task<IActionResult> GetAMPat(
        [FromQuery] string hhisnum,
        [FromQuery] string hcaseno,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(hhisnum) || string.IsNullOrWhiteSpace(hcaseno))
            return BadRequest(new { message = "hhisnum 與 hcaseno 為必填" });

        var result = await _vghksApi.GetAMPatAsync(hhisnum, hcaseno, ct);
        return Ok(result);
    }
}
