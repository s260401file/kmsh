using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

public interface ITextRepository
{
    /// <summary>查詢清單（可依 unitCode / category 篩選；includeAll=true 時含停用）</summary>
    Task<IEnumerable<TextItem>> GetAllAsync(string? unitCode = null, string? category = null, bool includeAll = false, CancellationToken ct = default);

    /// <summary>查詢單筆</summary>
    Task<TextItem?> GetByIdAsync(int id, CancellationToken ct = default);

    /// <summary>新增，回傳新 Id</summary>
    Task<int> CreateAsync(TextCreateRequest req, CancellationToken ct = default);

    /// <summary>修改，回傳是否成功</summary>
    Task<bool> UpdateAsync(int id, TextUpdateRequest req, CancellationToken ct = default);

    /// <summary>刪除，回傳是否成功</summary>
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
}
