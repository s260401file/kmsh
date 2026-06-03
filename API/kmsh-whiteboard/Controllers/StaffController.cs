using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StaffController : ControllerBase
{
    private readonly IKmuhApiService _kmuhApi;

    public StaffController(IKmuhApiService kmuhApi) => _kmuhApi = kmuhApi;

    /// <summary>查詢人員清單（近一年在職＋離職）</summary>
    [HttpGet("tms")]
    public async Task<IActionResult> GetTms(CancellationToken ct = default)
    {
        var result = await _kmuhApi.GetTmsAsync(ct);
        return Ok(result);
    }

    /// <summary>查詢單位資料</summary>
    [HttpGet("unit")]
    public async Task<IActionResult> GetUnit(CancellationToken ct = default)
    {
        var result = await _kmuhApi.GetUnitAsync(ct);
        return Ok(result);
    }
}
