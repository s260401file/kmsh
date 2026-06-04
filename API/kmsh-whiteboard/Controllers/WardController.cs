using System.ComponentModel;
using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

/// <summary>病房 / 床位查詢（高榮 AMDRService getBedList / getHnurstaList）</summary>
[ApiController]
[Route("api/[controller]")]
public class WardController : ControllerBase
{
    private readonly IVghksApiService _vghksApi;

    public WardController(IVghksApiService vghksApi) => _vghksApi = vghksApi;

    /// <summary>取得急診或住院病房清單</summary>
    /// <remarks>
    /// 用途：取得可查詢的病房代號（hnursta），作為 bed-list 的輸入參數。
    /// 回傳 resultList[].hnursta / hnnsname（病房代號 / 病房名稱）。
    /// </remarks>
    /// <param name="hcsetyp">就醫類型：E=急診（預設）、A=住院</param>
    [HttpGet("hnursta-list")]
    public async Task<IActionResult> GetHnurstaList(
        [FromQuery, DefaultValue("E")] string hcsetyp = "E",
        CancellationToken ct = default)
    {
        var result = await _vghksApi.GetHnurstaListAsync(hcsetyp, ct);
        return Ok(result);
    }

    /// <summary>取得指定病房的床位與在床病人清單</summary>
    /// <remarks>
    /// 先呼叫 hnursta-list 取得病房代號，再以此端點查詢該病房所有床位。
    /// 回傳 hbedList[]，包含：hhisnum（病歷號）、hnamec（姓名）、hbedno（床號）、
    /// hcaseno（就醫序號，可用於 /patient/er 或 /patient/am）、emgtyp（檢傷分類）、
    /// patflag.dnr（DNR）、doctor.hdocnamc（主治醫師）。
    /// </remarks>
    /// <param name="hnursta">病房代號（必填），由 hnursta-list 取得，範例：MER</param>
    /// <param name="hcasetyp">就醫類型：E=急診（預設）、A=住院</param>
    [HttpGet("bed-list")]
    public async Task<IActionResult> GetBedList(
        [FromQuery, DefaultValue("MER")] string hnursta,
        [FromQuery, DefaultValue("E")] string hcasetyp = "E",
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(hnursta))
            return BadRequest(new { message = "hnursta 為必填" });

        var result = await _vghksApi.GetBedListAsync(hnursta, hcasetyp, ct);
        return Ok(result);
    }
}
