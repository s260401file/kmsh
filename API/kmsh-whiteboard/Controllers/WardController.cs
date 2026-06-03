using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WardController : ControllerBase
{
    private readonly IVghksApiService _vghksApi;

    public WardController(IVghksApiService vghksApi) => _vghksApi = vghksApi;

    /// <summary>取得急診或住院病房清單</summary>
    /// <param name="hcsetyp">E=急診（預設）、A=住院</param>
    [HttpGet("hnursta-list")]
    public async Task<IActionResult> GetHnurstaList(
        [FromQuery] string hcsetyp = "E", CancellationToken ct = default)
    {
        var result = await _vghksApi.GetHnurstaListAsync(hcsetyp, ct);
        return Ok(result);
    }

    /// <summary>取得指定病房的床位與病人清單</summary>
    /// <param name="hnursta">病房代碼（必填）</param>
    /// <param name="hcasetyp">E=急診（預設）、A=住院</param>
    [HttpGet("bed-list")]
    public async Task<IActionResult> GetBedList(
        [FromQuery] string hnursta,
        [FromQuery] string hcasetyp = "E",
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(hnursta))
            return BadRequest(new { message = "hnursta 為必填" });

        var result = await _vghksApi.GetBedListAsync(hnursta, hcasetyp, ct);
        return Ok(result);
    }
}
