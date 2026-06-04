using System.ComponentModel;
using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

/// <summary>未執行檢查及會診清單（高榮 AMDRService qrynonexschlist）</summary>
[ApiController]
[Route("api/[controller]")]
public class NonExSchListController : ControllerBase
{
    private readonly IVghksApiService _vghksApi;

    public NonExSchListController(IVghksApiService vghksApi) => _vghksApi = vghksApi;

    /// <summary>查詢病患未執行的檢查 / 會診 / 手術清單</summary>
    /// <remarks>
    /// 僅顯示已排定時間的項目（未排定時間不顯示）。
    ///
    /// 回傳 resultList[] 欄位：
    /// - chktype：類別（CHK=檢查、CON=會診、OP=手術）
    /// - orproced：檢查/會診項目名稱
    /// - orschdt / orschtm：排程日期 / 時間
    /// - orstatuschn：狀態（中文）
    /// - hnursta / hbed：病房 / 床號
    /// - ordeptc：執行單位
    /// </remarks>
    /// <param name="hhisnum">病歷號（必填），範例：19000136</param>
    /// <param name="hcasetyp">就醫類型：A=住院（預設）、E=急診</param>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery, DefaultValue("19000136")] string hhisnum,
        [FromQuery, DefaultValue("A")] string? hcasetyp,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(hhisnum))
            return BadRequest(new { message = "hhisnum 為必填" });

        var result = await _vghksApi.GetNonExSchListAsync(hhisnum, hcasetyp, ct);
        return Ok(result);
    }
}
