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
}
