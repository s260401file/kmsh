using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>
/// 病室動態臨床補充層（[dbo].[WardPatientExt]）資料存取介面：
/// 以 UnitCode 分單位，Hhisnum 為病人鍵；供看板聚合查詢與後台 CRUD。
/// </summary>
public interface IWardRepository
{
    /// <summary>取得單位全部補充列（後台用，含停用）。</summary>
    Task<IEnumerable<WardPatientExtItem>> GetExtAsync(string unitCode, bool includeAll = true, CancellationToken ct = default);

    /// <summary>依 Id 取單筆。</summary>
    Task<WardPatientExtItem?> GetExtByIdAsync(int id, CancellationToken ct = default);

    /// <summary>新增，回傳新 Id。</summary>
    Task<int> CreateExtAsync(WardPatientExtUpsertRequest req, CancellationToken ct = default);

    /// <summary>依 Id 更新，回傳是否成功。</summary>
    Task<bool> UpdateExtAsync(int id, WardPatientExtUpsertRequest req, CancellationToken ct = default);

    /// <summary>依 Id 刪除，回傳是否成功。</summary>
    Task<bool> DeleteExtAsync(int id, CancellationToken ct = default);
}
