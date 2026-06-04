using System.ComponentModel;
using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

/// <summary>人事 / 排班查詢（高醫 KMUH HRS / UAS）— ⚠ 目前無法使用</summary>
[ApiController]
[Route("api/[controller]")]
public class HrController : ControllerBase
{
    private readonly IKmuhApiService _kmuhApi;

    public HrController(IKmuhApiService kmuhApi) => _kmuhApi = kmuhApi;

    /// <summary>查詢在職人事資料（含 VPN 及院內分機）— ⚠ KMUH API 尚未開放訪問</summary>
    /// <remarks>
    /// ⚠ **此端點目前不可用**：KMUH（高醫附設中和紀念醫院）API 尚未開放外部訪問，呼叫將回傳 503。
    ///
    /// 預期回傳欄位（待開放後）：
    /// - PE_NO / PE_NAME：員工編號 / 姓名
    /// - MVPN：公務電話；EXT：院內分機
    /// - TREAT_TITLE：職稱代碼（1=醫師、6=護理師）
    /// </remarks>
    /// <param name="unitcode">單位代號，5 碼，範例：31002</param>
    [HttpGet("hrs")]
    [Obsolete]
    public Task<IActionResult> GetHrs(
        [FromQuery, DefaultValue("31002")] string unitcode,
        CancellationToken ct = default)
    {
        return Task.FromResult<IActionResult>(
            StatusCode(503, new { message = "KMUH API 尚未開放訪問，請聯絡院方資訊室。" }));
    }

    /// <summary>查詢排班作業 — ⚠ KMUH API 尚未開放訪問</summary>
    /// <remarks>
    /// ⚠ **此端點目前不可用**：KMUH API 尚未開放外部訪問，呼叫將回傳 503。
    ///
    /// 預期回傳欄位（待開放後）：DATE1（排班日期）、CNO / NAME（班別）、ON_TIME1 / OFF_TIME1（上下班時間）。
    /// </remarks>
    /// <param name="unitcode">單位代號，範例：31307</param>
    /// <param name="month">排班月份 YYYY-MM-DD，範例：2026-06-01</param>
    [HttpGet("uas")]
    [Obsolete]
    public Task<IActionResult> GetUas(
        [FromQuery, DefaultValue("31307")] string unitcode,
        [FromQuery, DefaultValue("2026-06-01")] string month,
        CancellationToken ct = default)
    {
        return Task.FromResult<IActionResult>(
            StatusCode(503, new { message = "KMUH API 尚未開放訪問，請聯絡院方資訊室。" }));
    }
}
