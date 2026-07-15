using Dapper;
using kmsh_whiteboard.Data;
using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>通用看板圖片存取實作（Dapper；[dbo].[BoardImage]，以 Kind＋UnitCode 為鍵）。仿 EvacRepository 影像段。</summary>
public class BoardImageRepository : IBoardImageRepository
{
    private readonly DbConnectionFactory _db;
    public BoardImageRepository(DbConnectionFactory db) => _db = db;

    public async Task<BoardImageItem?> GetAsync(string kind, string unitCode, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<BoardImageItem>(
            new CommandDefinition("SELECT * FROM [dbo].[BoardImage] WHERE Kind = @Kind AND UnitCode = @UnitCode",
                new { Kind = kind, UnitCode = unitCode }, cancellationToken: ct));
    }

    public async Task UpsertAsync(string kind, string unitCode, string imagePath, string? origName, CancellationToken ct = default)
    {
        var sql = """
            MERGE [dbo].[BoardImage] AS T
            USING (SELECT @Kind AS Kind, @UnitCode AS UnitCode) AS S ON T.Kind = S.Kind AND T.UnitCode = S.UnitCode
            WHEN MATCHED THEN UPDATE SET ImagePath = @ImagePath, OrigName = @OrigName, UploadedAt = GETDATE()
            WHEN NOT MATCHED THEN INSERT (Kind, UnitCode, ImagePath, OrigName) VALUES (@Kind, @UnitCode, @ImagePath, @OrigName);
            """;
        using var conn = _db.Create();
        await conn.ExecuteAsync(new CommandDefinition(sql,
            new { Kind = kind, UnitCode = unitCode, ImagePath = imagePath, OrigName = origName }, cancellationToken: ct));
    }

    public async Task<bool> DeleteAsync(string kind, string unitCode, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[BoardImage] WHERE Kind = @Kind AND UnitCode = @UnitCode",
                new { Kind = kind, UnitCode = unitCode }, cancellationToken: ct));
        return rows > 0;
    }
}
