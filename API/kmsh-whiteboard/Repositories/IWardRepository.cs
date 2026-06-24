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

    // ── 各科值班醫師 [dbo].[ErOnCallDoctor] ──
    Task<IEnumerable<ErOnCallDoctorItem>> GetOnCallAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    Task<ErOnCallDoctorItem?> GetOnCallByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateOnCallAsync(ErOnCallDoctorUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateOnCallAsync(int id, ErOnCallDoctorUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteOnCallAsync(int id, CancellationToken ct = default);

    // ── ER 床位主檔 [dbo].[ErBed] ──
    Task<IEnumerable<ErBedItem>> GetErBedsAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    Task<ErBedItem?> GetErBedByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateErBedAsync(ErBedUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateErBedAsync(int id, ErBedUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteErBedAsync(int id, CancellationToken ct = default);

    // ── OR 刀房主檔 [dbo].[OrRoom] ──
    Task<IEnumerable<OrRoomItem>> GetOrRoomsAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    Task<OrRoomItem?> GetOrRoomByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateOrRoomAsync(OrRoomUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateOrRoomAsync(int id, OrRoomUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteOrRoomAsync(int id, CancellationToken ct = default);
}
