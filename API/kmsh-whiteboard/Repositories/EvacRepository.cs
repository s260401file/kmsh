using Dapper;
using kmsh_whiteboard.Data;
using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>
/// 緊急撤離資料存取實作（Dapper）：操作自建白板 DB 的 [dbo].[EvacImage]（撤離平面圖）、
/// [dbo].[EvacEquipment]（撤離設備）與 [dbo].[EvacContact]（緊急聯絡）三張表。
/// 清單查詢以 UnitCode 區分單位、以 SortOrder 排序、以 IsActive 控制啟用停用。
/// </summary>
public class EvacRepository : IEvacRepository
{
    private readonly DbConnectionFactory _db;
    /// <summary>建構子：注入 DB 連線工廠以取得 SqlConnection。</summary>
    public EvacRepository(DbConnectionFactory db) => _db = db;

    // ── 圖片 ─────────────────────────────────────────────────────

    /// <summary>依 unitCode 查詢 [dbo].[EvacImage] 的撤離平面圖（每單位至多一張），查無回傳 null。</summary>
    public async Task<EvacImageItem?> GetImageAsync(string unitCode, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<EvacImageItem>(
            new CommandDefinition("SELECT * FROM [dbo].[EvacImage] WHERE UnitCode = @UnitCode",
                new { UnitCode = unitCode }, cancellationToken: ct));
    }

    /// <summary>
    /// 以 MERGE 對 [dbo].[EvacImage] 進行 upsert：unitCode 已存在則更新圖檔路徑/原始檔名並刷新 UploadedAt（GETDATE()），
    /// 不存在則新增；確保每單位僅一筆。
    /// </summary>
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

    /// <summary>依 unitCode 刪除 [dbo].[EvacImage] 該單位的撤離平面圖，回傳是否有刪除成功。</summary>
    public async Task<bool> DeleteImageAsync(string unitCode, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[EvacImage] WHERE UnitCode = @UnitCode",
                new { UnitCode = unitCode }, cancellationToken: ct));
        return rows > 0;
    }

    // ── 設備清單 ──────────────────────────────────────────────────

    /// <summary>
    /// 查詢 [dbo].[EvacEquipment] 指定 unitCode 的撤離設備清單，依 SortOrder、Id 排序。
    /// includeAll=false 只回傳 IsActive=1；includeAll=true 連同停用一併回傳。
    /// </summary>
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

    /// <summary>依 Id 查詢 [dbo].[EvacEquipment] 單筆撤離設備，查無回傳 null。</summary>
    public async Task<EvacEquipmentItem?> GetEquipmentByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<EvacEquipmentItem>(
            new CommandDefinition("SELECT * FROM [dbo].[EvacEquipment] WHERE Id = @Id",
                new { Id = id }, cancellationToken: ct));
    }

    /// <summary>新增一筆撤離設備至 [dbo].[EvacEquipment]，IsActive 固定為 1（啟用）；透過 OUTPUT INSERTED.Id 回傳新建立的 Id。</summary>
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

    /// <summary>依 Id 更新 [dbo].[EvacEquipment] 該筆欄位（含 IsActive 啟用停用、SortOrder 排序），回傳是否有更新到資料列。</summary>
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

    /// <summary>依 Id 實際刪除 [dbo].[EvacEquipment] 該筆資料（硬刪除），回傳是否有刪除成功。</summary>
    public async Task<bool> DeleteEquipmentAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[EvacEquipment] WHERE Id=@Id",
                new { Id = id }, cancellationToken: ct)) > 0;
    }

    // ── 緊急聯絡 ──────────────────────────────────────────────────

    /// <summary>
    /// 查詢 [dbo].[EvacContact] 指定 unitCode 的緊急聯絡清單，依 SortOrder、Id 排序。
    /// includeAll=false 只回傳 IsActive=1；includeAll=true 連同停用一併回傳。
    /// </summary>
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

    /// <summary>依 Id 查詢 [dbo].[EvacContact] 單筆緊急聯絡，查無回傳 null。</summary>
    public async Task<EvacContactItem?> GetContactByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<EvacContactItem>(
            new CommandDefinition("SELECT * FROM [dbo].[EvacContact] WHERE Id=@Id",
                new { Id = id }, cancellationToken: ct));
    }

    /// <summary>新增一筆緊急聯絡至 [dbo].[EvacContact]，IsActive 固定為 1（啟用）；透過 OUTPUT INSERTED.Id 回傳新建立的 Id。</summary>
    public async Task<int> CreateContactAsync(EvacContactUpsertRequest req, CancellationToken ct = default)
    {
        var sql = """
            INSERT INTO [dbo].[EvacContact] (UnitCode, Name, Extension, SortOrder, IsActive)
            OUTPUT INSERTED.Id VALUES (@UnitCode, @Name, @Extension, @SortOrder, 1)
            """;
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    /// <summary>依 Id 更新 [dbo].[EvacContact] 該筆欄位（含 IsActive 啟用停用、SortOrder 排序），回傳是否有更新到資料列。</summary>
    public async Task<bool> UpdateContactAsync(int id, EvacContactUpsertRequest req, CancellationToken ct = default)
    {
        var sql = "UPDATE [dbo].[EvacContact] SET Name=@Name, Extension=@Extension, SortOrder=@SortOrder, IsActive=@IsActive WHERE Id=@Id";
        using var conn = _db.Create();
        return await conn.ExecuteAsync(new CommandDefinition(sql,
            new { req.Name, req.Extension, req.SortOrder, req.IsActive, Id = id },
            cancellationToken: ct)) > 0;
    }

    /// <summary>依 Id 實際刪除 [dbo].[EvacContact] 該筆資料（硬刪除），回傳是否有刪除成功。</summary>
    public async Task<bool> DeleteContactAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[EvacContact] WHERE Id=@Id",
                new { Id = id }, cancellationToken: ct)) > 0;
    }
}
