using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>
/// 文字內容資料存取介面：管理自建白板 DB 的 [dbo].[Text] 表，
/// 用於佈告欄、跑馬燈等自建文字內容；以 UnitCode（多單位）與 Category（分類）篩選、
/// 以 IsActive 控制啟用/停用、以 SortOrder 控制顯示排序。
/// </summary>
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
