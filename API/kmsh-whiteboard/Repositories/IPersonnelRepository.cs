using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>
/// 人員管理資料存取：人員主檔＋多單位多角色＋排班＋床位指派＋查房＋結構化交班。
/// 供後台 CRUD 與各站頁籤（排班/醫師/交班/照護團隊）組裝、以及員編登入權限推導。
/// </summary>
public interface IPersonnelRepository
{
    // ── 人員主檔 ──
    Task<IEnumerable<StaffItem>> GetStaffAsync(bool includeAll = true, CancellationToken ct = default);
    Task<StaffItem?> GetStaffByIdAsync(int id, CancellationToken ct = default);
    Task<StaffItem?> GetStaffByEmployeeNoAsync(string employeeNo, CancellationToken ct = default);
    Task<int> CreateStaffAsync(StaffUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateStaffAsync(int id, StaffUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteStaffAsync(int id, CancellationToken ct = default);

    // ── 人員×單位×角色 ──（含人員 join 欄位）
    Task<IEnumerable<StaffUnitRoleItem>> GetUnitRolesAsync(int? staffId = null, string? unitCode = null, bool includeAll = true, CancellationToken ct = default);
    Task<StaffUnitRoleItem?> GetUnitRoleByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateUnitRoleAsync(StaffUnitRoleUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateUnitRoleAsync(int id, StaffUnitRoleUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteUnitRoleAsync(int id, CancellationToken ct = default);

    // ── 排班 ──
    Task<IEnumerable<StaffScheduleItem>> GetScheduleAsync(string unitCode, string? date = null, bool includeAll = false, CancellationToken ct = default);
    Task<StaffScheduleItem?> GetScheduleByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateScheduleAsync(StaffScheduleUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateScheduleAsync(int id, StaffScheduleUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteScheduleAsync(int id, CancellationToken ct = default);

    // ── 床位指派 ──
    Task<IEnumerable<BedStaffAssignmentItem>> GetBedAssignAsync(string unitCode, string? date = null, string? assignType = null, bool includeAll = false, CancellationToken ct = default);
    Task<BedStaffAssignmentItem?> GetBedAssignByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateBedAssignAsync(BedStaffAssignmentUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateBedAssignAsync(int id, BedStaffAssignmentUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteBedAssignAsync(int id, CancellationToken ct = default);
    /// <summary>勾床配對：將某護理師在 unit/date 的「主護」床位設為恰好 bedIds（一床一主護，覆蓋他人）。</summary>
    Task SetBedNurseAsync(string unitCode, int staffId, string date, IEnumerable<string> bedIds, CancellationToken ct = default);

    // ── 查房表 ──
    Task<IEnumerable<DoctorRoundItem>> GetRoundAsync(string unitCode, string? date = null, bool includeAll = false, CancellationToken ct = default);
    Task<DoctorRoundItem?> GetRoundByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateRoundAsync(DoctorRoundUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateRoundAsync(int id, DoctorRoundUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteRoundAsync(int id, CancellationToken ct = default);

    // ── 護理交班 header ──
    Task<IEnumerable<HandoverShiftItem>> GetHandoverShiftsAsync(string unitCode, string? date = null, string? shift = null, bool includeAll = false, CancellationToken ct = default);
    Task<HandoverShiftItem?> GetHandoverShiftByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateHandoverShiftAsync(HandoverShiftUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateHandoverShiftAsync(int id, HandoverShiftUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteHandoverShiftAsync(int id, CancellationToken ct = default);

    // ── 護理交班-病人卡 ──
    Task<IEnumerable<HandoverPatientItem>> GetHandoverPatientsAsync(int shiftId, CancellationToken ct = default);
    Task<int> CreateHandoverPatientAsync(HandoverPatientUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateHandoverPatientAsync(int id, HandoverPatientUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteHandoverPatientAsync(int id, CancellationToken ct = default);

    // ── 護理交班-事項 ──
    Task<IEnumerable<HandoverNoteItem>> GetHandoverNotesAsync(int patientId, CancellationToken ct = default);
    Task<int> CreateHandoverNoteAsync(HandoverNoteUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateHandoverNoteAsync(int id, HandoverNoteUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteHandoverNoteAsync(int id, CancellationToken ct = default);
}
