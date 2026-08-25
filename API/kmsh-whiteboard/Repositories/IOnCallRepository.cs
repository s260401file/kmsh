using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>各科值班醫師「每日輪值排程」資料存取（OnCallDept 科別設定＋OnCallRoster 每日輪值）。</summary>
public interface IOnCallRepository
{
    // ── 科別設定 OnCallDept ──
    Task<IEnumerable<OnCallDeptItem>> GetDeptsAsync(bool includeAll = true, string? ownerUnit = null, CancellationToken ct = default);
    Task<OnCallDeptItem?> GetDeptByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateDeptAsync(OnCallDeptUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateDeptAsync(int id, OnCallDeptUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteDeptAsync(int id, CancellationToken ct = default);

    // ── 每日輪值 OnCallRoster ──
    Task<IEnumerable<OnCallRosterItem>> GetRosterAsync(string? deptCode, DateTime? from, DateTime? to, CancellationToken ct = default);
    Task<IEnumerable<OnCallRosterItem>> GetDayAsync(DateTime date, CancellationToken ct = default);
    Task<int> CreateRosterAsync(OnCallRosterUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateRosterAsync(int id, OnCallRosterUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteRosterAsync(int id, CancellationToken ct = default);
    /// <summary>覆寫某科某月：交易內先刪該月既有列、再插入 entries。回傳插入筆數。</summary>
    Task<int> SaveMonthAsync(OnCallMonthSaveRequest req, CancellationToken ct = default);

    // ── 各單位引用值班科別選取 UnitOnCallDept ──
    Task<IEnumerable<UnitOnCallDeptItem>> GetUnitDeptsAsync(string unitCode, CancellationToken ct = default);
    /// <summary>覆寫某單位整組科別選取（先刪後插）。回傳插入筆數。</summary>
    Task<int> SaveUnitDeptsAsync(string unitCode, IEnumerable<UnitOnCallDeptEntry> entries, CancellationToken ct = default);

    // ── 夜/假護理師值班表 NightNurseRoster ──
    Task<IEnumerable<NightNurseItem>> GetNightNurseAsync(DateTime from, DateTime to, CancellationToken ct = default);
    /// <summary>覆寫某月夜/假護理師：交易內先刪該月、再插入 entries。回傳插入筆數。</summary>
    Task<int> SaveNightNurseMonthAsync(NightNurseMonthSaveRequest req, CancellationToken ct = default);

    // ── 護理行政值班表 AdminDutyRoster ──
    Task<IEnumerable<AdminDutyItem>> GetAdminDutyAsync(DateTime from, DateTime to, CancellationToken ct = default);
    /// <summary>覆寫某月護理行政值班：交易內先刪該月、再插入 entries。回傳插入筆數。</summary>
    Task<int> SaveAdminDutyMonthAsync(AdminDutyMonthSaveRequest req, CancellationToken ct = default);

    // ── 當日專師排班 SpecialistRoster ──
    Task<IEnumerable<SpecialistItem>> GetSpecialistsAsync(string unitCode, DateTime from, DateTime to, CancellationToken ct = default);
    /// <summary>覆寫某站某月專師排班：交易內先刪該站該月、再插入 entries（姓名空白略過）。回傳插入筆數。</summary>
    Task<int> SaveSpecialistMonthAsync(SpecialistMonthSaveRequest req, CancellationToken ct = default);

    // ── 當日住院醫師排班 ResidentRoster ──
    Task<IEnumerable<ResidentItem>> GetResidentsAsync(string unitCode, DateTime from, DateTime to, CancellationToken ct = default);
    /// <summary>覆寫某站某月住院醫師排班：交易內先刪該站該月、再插入 entries（姓名空白略過）。回傳插入筆數。</summary>
    Task<int> SaveResidentMonthAsync(ResidentMonthSaveRequest req, CancellationToken ct = default);
}
