using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

public interface IContactRepository
{
    // 值班人員
    Task<IEnumerable<DutyContactItem>> GetDutyAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    Task<DutyContactItem?> GetDutyByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateDutyAsync(DutyContactUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateDutyAsync(int id, DutyContactUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteDutyAsync(int id, CancellationToken ct = default);

    // 常用電話
    Task<IEnumerable<CommonContactItem>> GetCommonAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    Task<CommonContactItem?> GetCommonByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateCommonAsync(CommonContactUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateCommonAsync(int id, CommonContactUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteCommonAsync(int id, CancellationToken ct = default);
}
