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

    // ── OR 手術派班-班級人員 [dbo].[OrShiftStaff] ──
    Task<IEnumerable<OrShiftStaffItem>> GetShiftStaffAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    Task<OrShiftStaffItem?> GetShiftStaffByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateShiftStaffAsync(OrShiftStaffUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateShiftStaffAsync(int id, OrShiftStaffUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteShiftStaffAsync(int id, CancellationToken ct = default);

    // ── OR 手術派班-房×班 刷手/流動 [dbo].[OrShiftRoom] ──
    Task<IEnumerable<OrShiftRoomItem>> GetShiftRoomAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    Task<OrShiftRoomItem?> GetShiftRoomByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateShiftRoomAsync(OrShiftRoomUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateShiftRoomAsync(int id, OrShiftRoomUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteShiftRoomAsync(int id, CancellationToken ct = default);

    // ── OR 特殊交班 [dbo].[OrHandover] ──
    Task<IEnumerable<OrHandoverItem>> GetHandoverAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    Task<OrHandoverItem?> GetHandoverByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateHandoverAsync(OrHandoverUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateHandoverAsync(int id, OrHandoverUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteHandoverAsync(int id, CancellationToken ct = default);

    // ── 各站頁首單位資訊 [dbo].[UnitInfo] ──
    Task<UnitInfoItem?> GetUnitInfoAsync(string unitCode, CancellationToken ct = default);
    Task<bool> UpsertUnitInfoAsync(UnitInfoUpsertRequest req, CancellationToken ct = default);

    // ── 檢查/會診 [dbo].[WardExamConsult] ──
    Task<IEnumerable<WardExamConsultItem>> GetExamConsultAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    Task<WardExamConsultItem?> GetExamConsultByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateExamConsultAsync(WardExamConsultUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateExamConsultAsync(int id, WardExamConsultUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteExamConsultAsync(int id, CancellationToken ct = default);

    // ── ICU 抗生素 [dbo].[IcuAntibiotic] ──
    Task<IEnumerable<IcuAntibioticItem>> GetAntibioticAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    Task<IcuAntibioticItem?> GetAntibioticByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateAntibioticAsync(IcuAntibioticUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateAntibioticAsync(int id, IcuAntibioticUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteAntibioticAsync(int id, CancellationToken ct = default);

    // ── OR 當日手術快照 [dbo].[OrDailySurgery] ──
    Task<IEnumerable<OrDailySurgeryItem>> GetOrDailyAsync(DateTime fromDate, DateTime toDate, CancellationToken ct = default);
    Task<int> UpsertOrDailyAsync(OrDailySurgeryItem it, CancellationToken ct = default);
    Task<int> MarkOrDailyCompletedAsync(DateTime date, IEnumerable<string> presentKeys, CancellationToken ct = default);
    Task<int> PurgeOrDailyAsync(DateTime beforeDate, CancellationToken ct = default);
}
