using Dapper;
using kmsh_whiteboard.Data;
using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

public class TextRepository : ITextRepository
{
    private readonly DbConnectionFactory _db;

    public TextRepository(DbConnectionFactory db) => _db = db;

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

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var sql = "DELETE FROM [dbo].[Text] WHERE Id = @Id";

        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition(sql, new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }
}
