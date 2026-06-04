using System.ComponentModel;
using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

/// <summary>病患資料查詢（高榮 AMDRService / UDSPService / MAASService + 高醫 KMUH CNC）</summary>
[ApiController]
[Route("api/[controller]")]
public class PatientController : ControllerBase
{
    private readonly IVghksApiService _vghksApi;
    private readonly IKmuhApiService _kmuhApi;

    public PatientController(IVghksApiService vghksApi, IKmuhApiService kmuhApi)
    {
        _vghksApi = vghksApi;
        _kmuhApi  = kmuhApi;
    }

    /// <summary>查詢急診病人詳細資料（高榮 getERPat）</summary>
    /// <remarks>
    /// 先呼叫 /api/Ward/bed-list 取得 hcaseno，再以此端點查詢詳細資料。
    ///
    /// 主要回傳欄位（amdrCase）：
    /// - hpbasic.hnamec：姓名；hemgtype：檢傷等級（1–5）；amdays：滯留時間（分鐘）
    /// - drName / nurseNo：負責醫師 / 主責護理師
    /// - patflag.hicmap.dnr：DNR；patflag.hicmap.fall：跌倒高危
    /// - diagnos.icd10lst：診斷碼清單
    /// </remarks>
    /// <param name="hhisnum">病歷號（必填），範例：19000136</param>
    /// <param name="hcaseno">就醫序號（必填），由 /api/Ward/bed-list 的 hcaseno 取得，範例：E20260001</param>
    /// <param name="hnursta">急診病房代碼（選填），範例：MER</param>
    /// <param name="hbedno">病床號（選填）</param>
    [HttpGet("er")]
    public async Task<IActionResult> GetERPat(
        [FromQuery, DefaultValue("19000136")] string hhisnum,
        [FromQuery, DefaultValue("E20260001")] string hcaseno,
        [FromQuery, DefaultValue("MER")] string? hnursta,
        [FromQuery] string? hbedno,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(hhisnum) || string.IsNullOrWhiteSpace(hcaseno))
            return BadRequest(new { message = "hhisnum 與 hcaseno 為必填" });

        var result = await _vghksApi.GetERPatAsync(hhisnum, hcaseno, hnursta, hbedno, ct);
        return Ok(result);
    }

    /// <summary>查詢住院病人詳細資料（高榮 getAMPat）</summary>
    /// <remarks>
    /// 欄位同 getERPat，另增加 aCase.hinptype（入院類型：O=門診、E=急診）。
    /// hcaseno 由 /api/Ward/bed-list（hcasetyp=A）的 hcaseno 取得。
    /// </remarks>
    /// <param name="hhisnum">病歷號（必填），範例：19000136</param>
    /// <param name="hcaseno">就醫序號（必填），範例：A20260001</param>
    [HttpGet("am")]
    public async Task<IActionResult> GetAMPat(
        [FromQuery, DefaultValue("19000136")] string hhisnum,
        [FromQuery, DefaultValue("A20260001")] string hcaseno,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(hhisnum) || string.IsNullOrWhiteSpace(hcaseno))
            return BadRequest(new { message = "hhisnum 與 hcaseno 為必填" });

        var result = await _vghksApi.GetAMPatAsync(hhisnum, hcaseno, ct);
        return Ok(result);
    }

    /// <summary>查詢過敏紀錄（高榮 UDSPService udhcpatsJSON）</summary>
    /// <remarks>
    /// 回傳病患藥物過敏及 ADR 不良反應紀錄。
    /// 回傳欄位（resultList[]）：type（過敏類別）、description（中文簡述）、
    /// descriptione（英文簡述）、dilation（詳述）、adr_desc / adr_dilation（ADR 不良反應）。
    /// 若無過敏紀錄回傳 resultList = []。
    /// </remarks>
    /// <param name="hhisnum">病歷號（必填），範例：19000136</param>
    [HttpGet("allergy")]
    public async Task<IActionResult> GetAllergy(
        [FromQuery, DefaultValue("19000136")] string hhisnum,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(hhisnum))
            return BadRequest(new { message = "hhisnum 為必填" });

        var result = await _vghksApi.GetAllergyAsync(hhisnum, ct);
        return Ok(result);
    }

    /// <summary>查詢病患基本資訊（高榮 MAASService getPatientInfo）</summary>
    /// <remarks>
    /// 依病歷號或身分證字號查詢病患目前病房、床號、生日等基本資訊。
    /// hhisnum 與 hidno 至少填一個。
    /// 查無病患時回傳：{"success":"N","msg":"查無病人: XXXXXX() 資訊。"}。
    /// 注意：MAASService 使用不同主機，需在 appsettings 設定 VghksApi:MaasBaseUrl。
    /// </remarks>
    /// <param name="hhisnum">病歷號（與 hidno 擇一），範例：19000136</param>
    /// <param name="hidno">身分證字號 / 居留證號（與 hhisnum 擇一）</param>
    [HttpGet("info")]
    public async Task<IActionResult> GetPatientInfo(
        [FromQuery, DefaultValue("19000136")] string? hhisnum,
        [FromQuery] string? hidno,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(hhisnum) && string.IsNullOrWhiteSpace(hidno))
            return BadRequest(new { message = "hhisnum 或 hidno 至少填一個" });

        var result = await _vghksApi.GetPatientInfoAsync(hhisnum, hidno, ct);
        return Ok(result);
    }

    /// <summary>查床號（高醫 KMUH CNC，GET + XML 轉 JSON）— ⚠ KMUH API 尚未開放訪問</summary>
    /// <remarks>
    /// ⚠ **此端點目前不可用**：KMUH API 尚未開放外部訪問，呼叫將回傳 503。
    ///
    /// 預期行為（待開放後）：院方回傳 XML，本端點自動解析為 JSON。
    /// 回傳欄位：bedNo / birthDate / chartNo / idno / patientName / sexId。
    /// </remarks>
    /// <param name="chartNo">病歷號（必填），範例：19000136</param>
    [HttpGet("cnc")]
    [Obsolete]
    public Task<IActionResult> GetCnc(
        [FromQuery, DefaultValue("19000136")] string chartNo,
        CancellationToken ct = default)
    {
        return Task.FromResult<IActionResult>(
            StatusCode(503, new { message = "KMUH API 尚未開放訪問，請聯絡院方資訊室。" }));
    }
}
