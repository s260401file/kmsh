using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>
/// 緊急撤離（Evacuation）資料存取介面：管理三類資料——
/// 「撤離平面圖（EvacImage，每單位一張）」、「撤離設備清單（EvacEquipment）」、「緊急聯絡（EvacContact）」。
/// 設備與聯絡皆以 unitCode 區分多單位、以 IsActive 控制啟用/停用、以 SortOrder 控制顯示排序。
/// </summary>
public interface IEvacRepository
{
    // 圖片
    /// <summary>查詢指定單位（unitCode）的撤離平面圖，查無回傳 null（每單位至多一張）。</summary>
    Task<EvacImageItem?> GetImageAsync(string unitCode, CancellationToken ct = default);
    /// <summary>新增或更新指定單位（unitCode）的撤離平面圖（圖檔路徑與原始檔名），已存在則覆蓋。</summary>
    Task UpsertImageAsync(string unitCode, string imagePath, string? origName, CancellationToken ct = default);
    /// <summary>刪除指定單位（unitCode）的撤離平面圖，回傳是否有刪除成功。</summary>
    Task<bool> DeleteImageAsync(string unitCode, CancellationToken ct = default);

    // 設備清單
    /// <summary>查詢指定單位（unitCode）的撤離設備清單，依 SortOrder 排序；includeAll=true 時連同停用（IsActive=0）一併回傳。</summary>
    Task<IEnumerable<EvacEquipmentItem>> GetEquipmentAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    /// <summary>依 Id 查詢單筆撤離設備資料，查無回傳 null。</summary>
    Task<EvacEquipmentItem?> GetEquipmentByIdAsync(int id, CancellationToken ct = default);
    /// <summary>新增一筆撤離設備（預設 IsActive=1），回傳新建立的 Id。</summary>
    Task<int> CreateEquipmentAsync(EvacEquipmentUpsertRequest req, CancellationToken ct = default);
    /// <summary>依 Id 更新撤離設備（含 IsActive 啟用停用、SortOrder 排序），回傳是否有更新到資料列。</summary>
    Task<bool> UpdateEquipmentAsync(int id, EvacEquipmentUpsertRequest req, CancellationToken ct = default);
    /// <summary>依 Id 實際刪除撤離設備資料列，回傳是否有刪除成功。</summary>
    Task<bool> DeleteEquipmentAsync(int id, CancellationToken ct = default);

    // 緊急聯絡
    /// <summary>查詢指定單位（unitCode）的緊急聯絡清單，依 SortOrder 排序；includeAll=true 時連同停用（IsActive=0）一併回傳。</summary>
    Task<IEnumerable<EvacContactItem>> GetContactAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    /// <summary>依 Id 查詢單筆緊急聯絡資料，查無回傳 null。</summary>
    Task<EvacContactItem?> GetContactByIdAsync(int id, CancellationToken ct = default);
    /// <summary>新增一筆緊急聯絡（預設 IsActive=1），回傳新建立的 Id。</summary>
    Task<int> CreateContactAsync(EvacContactUpsertRequest req, CancellationToken ct = default);
    /// <summary>依 Id 更新緊急聯絡（含 IsActive 啟用停用、SortOrder 排序），回傳是否有更新到資料列。</summary>
    Task<bool> UpdateContactAsync(int id, EvacContactUpsertRequest req, CancellationToken ct = default);
    /// <summary>依 Id 實際刪除緊急聯絡資料列，回傳是否有刪除成功。</summary>
    Task<bool> DeleteContactAsync(int id, CancellationToken ct = default);
}
