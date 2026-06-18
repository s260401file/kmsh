using kmsh_whiteboard.Models.Common;
using kmsh_whiteboard.Models.Lab;
using kmsh_whiteboard.Models.NonExSchList;
using kmsh_whiteboard.Models.Patient;
using kmsh_whiteboard.Models.Ward;

namespace kmsh_whiteboard.Services;

/// <summary>
/// 高榮（VGHKS）院方 HIS API 代理介面：封裝 AMDRService（病房／床位／病人）、
/// UDSPService（過敏）、MAASService（病患基本資訊，可能位於不同主機）、LABService（急作檢核）等服務。
/// 所有呼叫由服務層自動帶入認證參數（KeyId / hid / apid），呼叫端無需傳入。
/// </summary>
public interface IVghksApiService
{
    // 未執行檢查及會診清單
    /// <summary>呼叫高榮 AMDRService 查詢指定病歷號（hhisnum）的未執行檢查及會診清單；hcasetyp 可選填案件別。</summary>
    Task<VghksApiResponse<NonExSchListItem>> GetNonExSchListAsync(
        string hhisnum, string? hcasetyp = null, CancellationToken ct = default);

    // 取得急診/住院病房清單
    /// <summary>呼叫高榮 AMDRService 取得病房清單；hcsetyp 預設 "E"（急診），可改住院別。</summary>
    Task<VghksApiResponse<HnurstaItem>> GetHnurstaListAsync(
        string hcsetyp = "E", CancellationToken ct = default);

    // 取得病房病人床位清單
    /// <summary>呼叫高榮 AMDRService 取得指定病房（hnursta）的病人床位清單；hcasetyp 預設 "E"（急診）。</summary>
    Task<VghksApiResponse<BedListItem>> GetBedListAsync(
        string hnursta, string hcasetyp = "E", CancellationToken ct = default);

    // 急診病人詳細資料
    /// <summary>呼叫高榮 AMDRService getERPat 取得急診病人詳細資料；以 hhisnum、hcaseno 指定病人，hnursta/hbedno 可選填。</summary>
    Task<AmdrCaseResponse> GetERPatAsync(
        string hhisnum, string hcaseno,
        string? hnursta = null, string? hbedno = null,
        CancellationToken ct = default);

    // 住院病人詳細資料
    /// <summary>呼叫高榮 AMDRService getAMPat 取得住院病人詳細資料；以 hhisnum、hcaseno 指定病人。</summary>
    Task<AmdrCaseResponse> GetAMPatAsync(
        string hhisnum, string hcaseno, CancellationToken ct = default);

    // #5-5 過敏紀錄（UDSPService）
    /// <summary>呼叫高榮 UDSPService 取得指定病歷號（hhisnum）的過敏紀錄清單。</summary>
    Task<VghksApiResponse<AllergyItem>> GetAllergyAsync(
        string hhisnum, CancellationToken ct = default);

    // #8-2 病患基本資訊（MAASService，不同主機）
    /// <summary>
    /// 呼叫高榮 MAASService 取得病患基本資訊；以病歷號（hhisnum）或身分證號（hidno）查詢。
    /// MAAS 可能位於不同主機，服務層會視設定改用絕對 URL 呼叫。
    /// </summary>
    Task<MaasPatientResponse> GetPatientInfoAsync(
        string? hhisnum = null, string? hidno = null, CancellationToken ct = default);

    // #9 依標籤檢核急作（LABService）
    /// <summary>呼叫高榮 LABService 依檢驗標籤號（stickrno）檢核是否為急作（urgent），回傳檢核結果。</summary>
    Task<LabUrgentResponse> IsLabUrgentAsync(
        string stickrno, CancellationToken ct = default);
}
