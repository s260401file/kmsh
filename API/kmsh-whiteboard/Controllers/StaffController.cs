using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

/// <summary>人員 / 單位資料查詢（高醫 KMUH TMS / UNIT）— ⚠ 目前無法使用</summary>
[ApiController]
[Route("api/[controller]")]
public class StaffController : ControllerBase
{
    private readonly IKmuhApiService _kmuhApi;

    public StaffController(IKmuhApiService kmuhApi) => _kmuhApi = kmuhApi;

    /// <summary>查詢人員清單（近一年在職＋離職）— ⚠ KMUH API 尚未開放訪問</summary>
    /// <remarks>
    /// ⚠ **此端點目前不可用**：KMUH API 尚未開放外部訪問，呼叫將回傳 503。
    ///
    /// 預期回傳欄位（待開放後）：PE_NO / PE_NAME（員工編號 / 姓名）、EMAIL、TEL、IN_DATE / OUT_DATE（到離職日）。
    /// </remarks>
    [HttpGet("tms")]
    [Obsolete]
    public async Task<IActionResult> GetTms(CancellationToken ct = default)
    {
        return StatusCode(503, new { message = "KMUH API 尚未開放訪問，請聯絡院方資訊室。" });
    }

    /// <summary>查詢全院單位資料 — ⚠ KMUH API 尚未開放訪問</summary>
    /// <remarks>
    /// ⚠ **此端點目前不可用**：KMUH API 尚未開放外部訪問，呼叫將回傳 503。
    ///
    /// 預期回傳欄位（待開放後）：UNITCODE / UNITNAME（代號 / 名稱）、PARENT_CODE、CHIEF_ACCOUNT（主管帳號）。
    /// </remarks>
    [HttpGet("unit")]
    [Obsolete]
    public async Task<IActionResult> GetUnit(CancellationToken ct = default)
    {
        return StatusCode(503, new { message = "KMUH API 尚未開放訪問，請聯絡院方資訊室。" });
    }
}
