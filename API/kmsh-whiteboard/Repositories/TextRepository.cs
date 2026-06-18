using Dapper;
using kmsh_whiteboard.Data;
using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>
/// 文字內容資料存取實作（Dapper）：操作自建白板 DB 的 [dbo].[Text] 表（佈告欄／跑馬燈等內容）。
/// 查詢可依 UnitCode、Category 篩選並以 SortOrder 排序，IsActive 控制啟用停用。
/// </summary>
public class TextRepository : ITextRepository
{
    private readonly DbConnectionFactory _db;

    /// <summary>建構子：注入 DB 連線工廠以取得 SqlConnection。</summary>
    public TextRepository(DbConnectionFactory db) => _db = db;

    /// <summary>
    /// 查詢 [dbo].[Text] 清單，依 SortOrder、Id 排序；unitCode/category 為 null 時不套用該篩選；
    /// includeAll=false 只回傳 IsActive=1，includeAll=true 連同停用一併回傳。
    /// </summary>
    public async Task<IEnumerable<TextItem>> GetAllAsync(
        string? unitCode = null, string? category = null, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = """
            SELECT Id, Title, Content, Category, UnitCode, Priority, SortOrder, IsActive, CreatedAt, UpdatedAt
            FROM   [dbo].[Text]
            WHERE  (@IncludeAll = 1 OR IsActive = 1)
              AND  (@UnitCode  IS NULL OR UnitCode  = @UnitCode)
              AND  (@Category  IS NULL OR Category  = @Category)
            ORDER  BY SortOrder, Id
            """;

        using var conn = _db.Create();
        return await conn.QueryAsync<TextItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, Category = category, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    /// <summary>依 Id 查詢 [dbo].[Text] 單筆文字內容，查無回傳 null。</summary>
    public async Task<TextItem?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var sql = """
            SELECT Id, Title, Content, Category, UnitCode, Priority, SortOrder, IsActive, CreatedAt, UpdatedAt
            FROM   [dbo].[Text]
            WHERE  Id = @Id
            """;

        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<TextItem>(
            new CommandDefinition(sql, new { Id = id }, cancellationToken: ct));
    }

    /// <summary>
    /// 新增一筆文字內容至 [dbo].[Text]，CreatedAt/UpdatedAt 由 GETDATE() 帶入、IsActive 固定為 1（啟用）；
    /// 透過 OUTPUT INSERTED.Id 回傳新建立的 Id。
    /// </summary>
    public async Task<int> CreateAsync(TextCreateRequest req, CancellationToken ct = default)
    {
        var sql = """
            INSERT INTO [dbo].[Text] (Title, Content, Category, UnitCode, Priority, SortOrder, IsActive, CreatedAt, UpdatedAt)
            OUTPUT INSERTED.Id
            VALUES (@Title, @Content, @Category, @UnitCode, @Priority, @SortOrder, 1, GETDATE(), GETDATE())
            """;

        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, req, cancellationToken: ct));
    }

    /// <summary>
    /// 依 Id 更新 [dbo].[Text] 該筆欄位（含 IsActive 啟用停用、SortOrder 排序），UpdatedAt 刷新為 GETDATE()，
    /// 回傳是否有更新到資料列。
    /// </summary>
    public async Task<bool> UpdateAsync(int id, TextUpdateRequest req, CancellationToken ct = default)
    {
        var sql = """
            UPDATE [dbo].[Text]
            SET    Title     = @Title,
                   Content   = @Content,
                   Category  = @Category,
                   UnitCode  = @UnitCode,
                   Priority  = @Priority,
                   SortOrder = @SortOrder,
                   IsActive  = @IsActive,
                   UpdatedAt = GETDATE()
            WHERE  Id = @Id
            """;

        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition(sql,
                new { req.Title, req.Content, req.Category, req.UnitCode, req.Priority, req.SortOrder, req.IsActive, Id = id },
                cancellationToken: ct));
        return rows > 0;
    }

    /// <summary>依 Id 實際刪除 [dbo].[Text] 該筆資料（硬刪除），回傳是否有刪除成功。</summary>
    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var sql = "DELETE FROM [dbo].[Text] WHERE Id = @Id";

        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition(sql, new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }
}
