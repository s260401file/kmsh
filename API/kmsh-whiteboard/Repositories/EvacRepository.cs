using Dapper;
using kmsh_whiteboard.Data;
using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

public class EvacRepository : IEvacRepository
{
    private readonly DbConnectionFactory _db;
    public EvacRepository(DbConnectionFactory db) => _db = db;

    // ── 圖片 ─────────────────────────────────────────────────────

    public async Task<EvacImageItem?> GetImageAsync(string unitCode, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<EvacImageItem>(
            new CommandDefinition("SELECT * FROM [dbo].[EvacImage] WHERE UnitCode = @UnitCode",
                new { UnitCode = unitCode }, cancellationToken: ct));
    }

    public async Task UpsertImageAsync(string unitCode, string imagePath, string? origName, CancellationToken ct = default)
    {
        var sql = """
            MERGE [dbo].[EvacImage] AS T
            USING (SELECT @UnitCode AS UnitCode) AS S ON T.UnitCode = S.UnitCode
            WHEN MATCHED THEN UPDATE SET ImagePath = @ImagePath, OrigName = @OrigName, UploadedAt = GETDATE()
            WHEN NOT MATCHED THEN INSERT (UnitCode, ImagePath, OrigName) VALUES (@UnitCode, @ImagePath, @OrigName);
            """;
        using var conn = _db.Create();
        await conn.ExecuteAsync(new CommandDefinition(sql, new { UnitCode = unitCode, ImagePath = imagePath, OrigName = origName }, cancellationToken: ct));
    }

    public async Task<bool> DeleteImageAsync(string unitCode, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[EvacImage] WHERE UnitCode = @UnitCode",
                new { UnitCode = unitCode }, cancellationToken: ct));
        return rows > 0;
    }

    // ── 設備清單 ──────────────────────────────────────────────────

    public async Task<IEnumerable<EvacEquipmentItem>> GetEquipmentAsync(
        string unitCode, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = """
            SELECT * FROM [dbo].[EvacEquipment]
            WHERE UnitCode = @UnitCode AND (@IncludeAll = 1 OR IsActive = 1)
            ORDER BY SortOrder, Id
            """;
        using var conn = _db.Create();
        return await conn.QueryAsync<EvacEquipmentItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<EvacEquipmentItem?> GetEquipmentByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<EvacEquipmentItem>(
            new CommandDefinition("SELECT * FROM [dbo].[EvacEquipment] WHERE Id = @Id",
                new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateEquipmentAsync(EvacEquipmentUpsertRequest req, CancellationToken ct = default)
    {
        var sql = """
            INSERT INTO [dbo].[EvacEquipment] (UnitCode, EquipmentName, Location, Quantity, SortOrder, IsActive)
            OUTPUT INSERTED.Id
            VALUES (@UnitCode, @EquipmentName, @Location, @Quantity, @SortOrder, 1)
            """;
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateEquipmentAsync(int id, EvacEquipmentUpsertRequest req, CancellationToken ct = default)
    {
        var sql = """
            UPDATE [dbo].[EvacEquipment]
            SET EquipmentName=@EquipmentName, Location=@Location, Quantity=@Quantity,
                SortOrder=@SortOrder, IsActive=@IsActive
            WHERE Id=@Id
            """;
        using var conn = _db.Create();
        return await conn.ExecuteAsync(new CommandDefinition(sql,
            new { req.EquipmentName, req.Location, req.Quantity, req.SortOrder, req.IsActive, Id = id },
            cancellationToken: ct)) > 0;
    }

    public async Task<bool> DeleteEquipmentAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[EvacEquipment] WHERE Id=@Id",
                new { Id = id }, cancellationToken: ct)) > 0;
    }

    // ── 緊急聯絡 ──────────────────────────────────────────────────

    public async Task<IEnumerable<EvacContactItem>> GetContactAsync(
        string unitCode, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = """
            SELECT * FROM [dbo].[EvacContact]
            WHERE UnitCode = @UnitCode AND (@IncludeAll = 1 OR IsActive = 1)
            ORDER BY SortOrder, Id
            """;
        using var conn = _db.Create();
        return await conn.QueryAsync<EvacContactItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<EvacContactItem?> GetContactByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<EvacContactItem>(
            new CommandDefinition("SELECT * FROM [dbo].[EvacContact] WHERE Id=@Id",
                new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateContactAsync(EvacContactUpsertRequest req, CancellationToken ct = default)
    {
        var sql = """
            INSERT INTO [dbo].[EvacContact] (UnitCode, Name, Extension, SortOrder, IsActive)
            OUTPUT INSERTED.Id VALUES (@UnitCode, @Name, @Extension, @SortOrder, 1)
            """;
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateContactAsync(int id, EvacContactUpsertRequest req, CancellationToken ct = default)
    {
        var sql = "UPDATE [dbo].[EvacContact] SET Name=@Name, Extension=@Extension, SortOrder=@SortOrder, IsActive=@IsActive WHERE Id=@Id";
        using var conn = _db.Create();
        return await conn.ExecuteAsync(new CommandDefinition(sql,
            new { req.Name, req.Extension, req.SortOrder, req.IsActive, Id = id },
            cancellationToken: ct)) > 0;
    }

    public async Task<bool> DeleteContactAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[EvacContact] WHERE Id=@Id",
                new { Id = id }, cancellationToken: ct)) > 0;
    }
}
