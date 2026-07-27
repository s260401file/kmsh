using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>全院共用主檔存取：科別 Department ＋ 醫師 Doctor。</summary>
public interface IMasterDataRepository
{
    // ── 科別 ──
    Task<IEnumerable<DepartmentItem>> GetDepartmentsAsync(bool includeAll, CancellationToken ct = default);
    Task<int> CreateDepartmentAsync(DepartmentUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateDepartmentAsync(int id, DepartmentUpsertRequest req, CancellationToken ct = default);
    /// <summary>刪除科別；若已被醫師使用則不刪。回 (deleted, blockReason)：deleted=true 已刪；
    /// deleted=false 且 reason!=null＝被擋（含原因）；deleted=false 且 reason==null＝查無此科別。</summary>
    Task<(bool deleted, string? reason)> DeleteDepartmentAsync(int id, CancellationToken ct = default);

    // ── 醫師 ──
    Task<IEnumerable<DoctorItem>> GetDoctorsAsync(bool includeAll, string? deptCode, CancellationToken ct = default);
    Task<int> CreateDoctorAsync(DoctorUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateDoctorAsync(int id, DoctorUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteDoctorAsync(int id, CancellationToken ct = default);

    // ── 照服員 ──
    Task<IEnumerable<CareAideItem>> GetCareAidesAsync(bool includeAll, CancellationToken ct = default);
    Task<int> CreateCareAideAsync(CareAideUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateCareAideAsync(int id, CareAideUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteCareAideAsync(int id, CancellationToken ct = default);

    // ── ER 急診醫師 ──
    Task<IEnumerable<ErDoctorItem>> GetErDoctorsAsync(bool includeAll, CancellationToken ct = default);
    Task<int> CreateErDoctorAsync(ErDoctorUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateErDoctorAsync(int id, ErDoctorUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteErDoctorAsync(int id, CancellationToken ct = default);

    // ── ER 急診醫師 每日緊急編組／點班 ──
    Task<IEnumerable<ErDoctorGroupItem>> GetErDoctorGroupsAsync(string workDate, CancellationToken ct = default);
    Task<int> SaveErDoctorGroupAsync(string workDate, IEnumerable<ErDoctorGroupEntry> entries, CancellationToken ct = default);

    // ── 各單位「顯示照服員」選取 UnitCareAide ──
    Task<IEnumerable<UnitCareAideItem>> GetUnitAidesAsync(string unitCode, CancellationToken ct = default);
    /// <summary>覆寫某單位整組照服員選取（先刪後插）。回傳插入筆數。</summary>
    Task<int> SaveUnitAidesAsync(string unitCode, IEnumerable<UnitCareAideEntry> entries, CancellationToken ct = default);
}
