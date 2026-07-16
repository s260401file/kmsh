using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>
/// 聯絡資訊資料存取介面：管理「值班人員（DutyContact）」與「常用電話（CommonContact）」兩張表的 CRUD。
/// 皆以 unitCode 區分多單位，並以 IsActive 控制啟用/停用、SortOrder 控制顯示排序。
/// </summary>
public interface IContactRepository
{
    // 值班人員
    /// <summary>查詢指定單位（unitCode）的值班人員清單，依 SortOrder 排序；includeAll=true 時連同停用（IsActive=0）一併回傳。</summary>
    Task<IEnumerable<DutyContactItem>> GetDutyAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    /// <summary>依 Id 查詢單筆值班人員資料，查無回傳 null。</summary>
    Task<DutyContactItem?> GetDutyByIdAsync(int id, CancellationToken ct = default);
    /// <summary>新增一筆值班人員（預設 IsActive=1），回傳新建立的 Id。</summary>
    Task<int> CreateDutyAsync(DutyContactUpsertRequest req, CancellationToken ct = default);
    /// <summary>依 Id 更新值班人員（含 IsActive 啟用停用、SortOrder 排序），回傳是否有更新到資料列。</summary>
    Task<bool> UpdateDutyAsync(int id, DutyContactUpsertRequest req, CancellationToken ct = default);
    /// <summary>依 Id 實際刪除值班人員資料列，回傳是否有刪除成功。</summary>
    Task<bool> DeleteDutyAsync(int id, CancellationToken ct = default);

    // 常用電話
    /// <summary>查詢指定單位（unitCode）的常用電話清單，依 SortOrder 排序；includeAll=true 時連同停用（IsActive=0）一併回傳。</summary>
    Task<IEnumerable<CommonContactItem>> GetCommonAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    /// <summary>依 Id 查詢單筆常用電話資料，查無回傳 null。</summary>
    Task<CommonContactItem?> GetCommonByIdAsync(int id, CancellationToken ct = default);
    /// <summary>新增一筆常用電話（預設 IsActive=1），回傳新建立的 Id。</summary>
    Task<int> CreateCommonAsync(CommonContactUpsertRequest req, CancellationToken ct = default);
    /// <summary>依 Id 更新常用電話（含 IsActive 啟用停用、SortOrder 排序），回傳是否有更新到資料列。</summary>
    Task<bool> UpdateCommonAsync(int id, CommonContactUpsertRequest req, CancellationToken ct = default);
    /// <summary>依 Id 實際刪除常用電話資料列，回傳是否有刪除成功。</summary>
    Task<bool> DeleteCommonAsync(int id, CancellationToken ct = default);

    // 值班表聯絡電話（ContactPhone；比照常用電話，多標題欄）
    Task<IEnumerable<ContactPhoneItem>> GetPhoneAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    Task<ContactPhoneItem?> GetPhoneByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreatePhoneAsync(ContactPhoneUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdatePhoneAsync(int id, ContactPhoneUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeletePhoneAsync(int id, CancellationToken ct = default);
}
