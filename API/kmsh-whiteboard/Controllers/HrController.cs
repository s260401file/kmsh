using System.ComponentModel;
using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HrController : ControllerBase
{
    private readonly IKmuhApiService _kmuhApi;

    public HrController(IKmuhApiService kmuhApi) => _kmuhApi = kmuhApi;

    /// <summary>查詢在職人事資料（含 VPN 及分機）</summary>
    /// <param name="unitcode">單位代號（必填）</param>
    [HttpGet("hrs")]
    public async Task<IActionResult> GetHrs(
        [FromQuery, DefaultValue("31002")] string unitcode, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(unitcode))
            return BadRequest(new { message = "unitcode 為必填" });

        var result = await _kmuhApi.GetHrsAsync(unitcode, ct);
        return Ok(result);
    }

    /// <summary>查詢排班作業</summary>
    /// <param name="unitcode">單位代號（必填）</param>
    /// <param name="month">排班月份，格式 YYYY-MM-DD（必填）</param>
    [HttpGet("uas")]
    public async Task<IActionResult> GetUas(
        [FromQuery, DefaultValue("31307")] string unitcode,
        [FromQuery, DefaultValue("2025-05-01")] string month,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(unitcode) || string.IsNullOrWhiteSpace(month))
            return BadRequest(new { message = "unitcode 與 month 為必填" });

        var result = await _kmuhApi.GetUasAsync(unitcode, month, ct);
        return Ok(result);
    }
}
