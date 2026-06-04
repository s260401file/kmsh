using System.ComponentModel;
using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

/// <summary>檢驗相關查詢（高榮 LABService）</summary>
[ApiController]
[Route("api/[controller]")]
public class LabController : ControllerBase
{
    private readonly IVghksApiService _vghksApi;

    public LabController(IVghksApiService vghksApi) => _vghksApi = vghksApi;

    /// <summary>依標籤號碼檢核是否為急作</summary>
    /// <remarks>
    /// 輸入檢驗標籤號碼（stickrno），回傳該標本是否需要急作處理。
    ///
    /// 回傳格式：{"success":"Y","msg":"","urgent":"N"}
    /// - urgent = Y：急作；urgent = N：非急作
    /// - success = N：標籤號碼查無資料或系統錯誤，詳見 msg
    /// </remarks>
    /// <param name="stickrno">標籤號碼（必填），範例：1012642002</param>
    [HttpGet("urgent")]
    public async Task<IActionResult> IsUrgent(
        [FromQuery, DefaultValue("1012642002")] string stickrno,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(stickrno))
            return BadRequest(new { message = "stickrno 為必填" });

        var result = await _vghksApi.IsLabUrgentAsync(stickrno, ct);
        return Ok(result);
    }
}
