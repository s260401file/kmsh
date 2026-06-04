using System.ComponentModel;
using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

/// <summary>維修單查詢（高醫 KMUH ERS）— ⚠ 目前無法使用</summary>
[ApiController]
[Route("api/[controller]")]
public class MaintenanceController : ControllerBase
{
    private readonly IKmuhApiService _kmuhApi;

    public MaintenanceController(IKmuhApiService kmuhApi) => _kmuhApi = kmuhApi;

    /// <summary>查詢單位未結案維修單 — ⚠ KMUH API 尚未開放訪問</summary>
    /// <remarks>
    /// ⚠ **此端點目前不可用**：KMUH（高醫附設中和紀念醫院）API 尚未開放外部訪問，呼叫將回傳 503。
    ///
    /// 預期回傳欄位（待開放後）：ERS_NO（維修單號）、PRO_NAME（財產名稱）、EXP_DATE（預計完成日）、FLAG（流程狀態）。
    /// FLAG：-1=退件、0=申請未送出、3=處理中、5=完成未結案、6=完成已結案。
    /// </remarks>
    /// <param name="unitcode">單位代號，5 碼，範例：31304</param>
    [HttpGet]
    [Obsolete]
    public async Task<IActionResult> GetErs(
        [FromQuery, DefaultValue("31304")] string unitcode,
        CancellationToken ct = default)
    {
        return StatusCode(503, new { message = "KMUH API 尚未開放訪問，請聯絡院方資訊室。" });
    }
}
