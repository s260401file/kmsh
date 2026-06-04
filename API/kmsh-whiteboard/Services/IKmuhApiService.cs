using kmsh_whiteboard.Models.Hr;
using kmsh_whiteboard.Models.Maintenance;
using kmsh_whiteboard.Models.Patient;
using kmsh_whiteboard.Models.Staff;

namespace kmsh_whiteboard.Services;

public interface IKmuhApiService
{
    // 查詢在職人事資料
    Task<List<HrsItem>> GetHrsAsync(string unitcode, CancellationToken ct = default);

    // 查詢排班作業
    Task<List<UasItem>> GetUasAsync(string unitcode, string month, CancellationToken ct = default);

    // 查詢維修單
    Task<List<ErsItem>> GetErsAsync(string unitcode, CancellationToken ct = default);

    // 查詢人員清單（近一年在職+離職）
    Task<List<TmsItem>> GetTmsAsync(CancellationToken ct = default);

    // 單位資料查詢
    Task<List<UnitItem>> GetUnitAsync(CancellationToken ct = default);

    // #8-1 KMUH 查床號（GET + XML 回應）
    Task<CncResult?> GetCncAsync(string chartNo, CancellationToken ct = default);
}
