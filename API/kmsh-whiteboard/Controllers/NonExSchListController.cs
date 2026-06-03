using System.ComponentModel;
using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NonExSchListController : ControllerBase
{
    private readonly IVghksApiService _vghksApi;

    public NonExSchListController(IVghksApiService vghksApi)
    {
        _vghksApi = vghksApi;
    }

    /// <summary>
    /// 查詢未執行檢查及會診清單
    /// </summary>
    /// <param name="hhisnum">病歷號（必填）</param>
    /// <param name="hcasetyp">就醫類型：A=住院，E=急診（選填）</param>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery, DefaultValue("19000136")] string hhisnum,
        [FromQuery, DefaultValue("A")] string? hcasetyp,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(hhisnum))
            return BadRequest(new { message = "hhisnum 為必填" });

        var result = await _vghksApi.GetNonExSchListAsync(hhisnum, hcasetyp, ct);
        return Ok(result);
    }
}
