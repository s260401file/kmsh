using kmsh_whiteboard.Models.Hr;
using kmsh_whiteboard.Models.Maintenance;
using kmsh_whiteboard.Models.Patient;
using kmsh_whiteboard.Models.Staff;

namespace kmsh_whiteboard.Services;

/// <summary>
/// 高醫（KMUH）院方 HIS API 代理介面：封裝人事、排班、維修、單位與床號查詢等服務。
/// 多數端點以 POST + JSON 呼叫（api/HRS、api/UAS、api/ERS、api/TMS、api/UNIT），
/// 查床號（api/CNC）為 GET 並回傳 XML。
/// </summary>
public interface IKmuhApiService
{
    // 查詢在職人事資料
    /// <summary>呼叫高醫 api/HRS（POST JSON），傳入 unitcode 查詢該單位在職人事資料，回傳人事清單。</summary>
    Task<List<HrsItem>> GetHrsAsync(string unitcode, CancellationToken ct = default);

    // 查詢排班作業
    /// <summary>呼叫高醫 api/UAS（POST JSON），傳入 unitcode 與 month 查詢該單位該月排班作業，回傳排班清單。</summary>
    Task<List<UasItem>> GetUasAsync(string unitcode, string month, CancellationToken ct = default);

    // 查詢維修單
    /// <summary>呼叫高醫 api/ERS（POST JSON），傳入 unitcode 查詢該單位維修單，回傳維修單清單。</summary>
    Task<List<ErsItem>> GetErsAsync(string unitcode, CancellationToken ct = default);

    // 查詢人員清單（近一年在職+離職）
    /// <summary>呼叫高醫 api/TMS（POST JSON，無參數）查詢近一年在職＋離職人員清單，回傳人員清單。</summary>
    Task<List<TmsItem>> GetTmsAsync(CancellationToken ct = default);

    // 單位資料查詢
    /// <summary>呼叫高醫 api/UNIT（POST JSON，無參數）查詢所有單位資料，回傳單位清單。</summary>
    Task<List<UnitItem>> GetUnitAsync(CancellationToken ct = default);

    // #8-1 KMUH 查床號（GET + XML 回應）
    /// <summary>
    /// 呼叫高醫 api/CNC（GET，回應為 XML），依病歷號 chartNo 查詢床號等基本資料；
    /// 解析 XML 為 CncResult，回應為空或解析失敗時回傳 null。
    /// </summary>
    Task<CncResult?> GetCncAsync(string chartNo, CancellationToken ct = default);
}
