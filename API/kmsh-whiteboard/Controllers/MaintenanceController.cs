using System.ComponentModel;
using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaintenanceController : ControllerBase
{
    private readonly IKmuhApiService _kmuhApi;

    public MaintenanceController(IKmuhApiService kmuhApi) => _kmuhApi = kmuhApi;

    /// <summary>查詢單位維修單（未結案）</summary>
    /// <param name="unitcode">單位代號（必填）</param>
    [HttpGet]
    public async Task<IActionResult> GetErs(
        [FromQuery, DefaultValue("31304")] string unitcode, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(unitcode))
            return BadRequest(new { message = "unitcode 為必填" });

        var result = await _kmuhApi.GetErsAsync(unitcode, ct);
        return Ok(result);
    }
}
