using Dapper;
using kmsh_whiteboard.Data;
using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>
/// 聯絡資訊資料存取實作（Dapper）：操作自建白板 DB 的 [dbo].[DutyContact]（值班人員）
/// 與 [dbo].[CommonContact]（常用電話）兩張表。所有查詢以 UnitCode 區分單位、以 SortOrder 排序。
/// </summary>
public class ContactRepository : IContactRepository
{
    private readonly DbConnectionFactory _db;

    /// <summary>建構子：注入 DB 連線工廠以取得 SqlConnection。</summary>
    public ContactRepository(DbConnectionFactory db) => _db = db;

    // ── 值班人員 ──────────────────────────────────────────────────

    /// <summary>
    /// 查詢 [dbo].[DutyContact] 指定 unitCode 的值班人員清單，依 SortOrder、Id 排序。
    /// includeAll=false 只回傳 IsActive=1；includeAll=true 連同停用一併回傳。
    /// </summary>
    public async Task<IEnumerable<DutyContactItem>> GetDutyAsync(
        string unitCode, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = """
            SELECT Id, UnitCode, ShiftType, TimeSlot, DutyTitle, Name, Extension, Mobile,
                   SortOrder, IsActive, CreatedAt
            FROM   [dbo].[DutyContact]
            WHERE  UnitCode = @UnitCode
              AND  (@IncludeAll = 1 OR IsActive = 1)
            ORDER  BY SortOrder, Id
            """;
        using var conn = _db.Create();
        return await conn.QueryAsync<DutyContactItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    /// <summary>依 Id 查詢 [dbo].[DutyContact] 單筆值班人員，查無回傳 null。</summary>
    public async Task<DutyContactItem?> GetDutyByIdAsync(int id, CancellationToken ct = default)
    {
        var sql = "SELECT * FROM [dbo].[DutyContact] WHERE Id = @Id";
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<DutyContactItem>(
            new CommandDefinition(sql, new { Id = id }, cancellationToken: ct));
    }

    /// <summary>
    /// 新增一筆值班人員至 [dbo].[DutyContact]，CreatedAt 由 GETDATE() 帶入、IsActive 固定為 1（啟用）；
    /// 透過 OUTPUT INSERTED.Id 回傳新建立的 Id。
    /// </summary>
    public async Task<int> CreateDutyAsync(DutyContactUpsertRequest req, CancellationToken ct = default)
    {
        var sql = """
            INSERT INTO [dbo].[DutyContact]
              (UnitCode, ShiftType, TimeSlot, DutyTitle, Name, Extension, Mobile, SortOrder, IsActive, CreatedAt)
            OUTPUT INSERTED.Id
            VALUES (@UnitCode, @ShiftType, @TimeSlot, @DutyTitle, @Name, @Extension, @Mobile, @SortOrder, 1, GETDATE())
            """;
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    /// <summary>
    /// 依 Id 更新 [dbo].[DutyContact] 該筆所有欄位（含 IsActive 啟用停用切換、SortOrder 排序），
    /// 回傳是否有更新到資料列（rows > 0）。
    /// </summary>
    public async Task<bool> UpdateDutyAsync(int id, DutyContactUpsertRequest req, CancellationToken ct = default)
    {
        var sql = """
            UPDATE [dbo].[DutyContact]
            SET    UnitCode  = @UnitCode,
                   ShiftType = @ShiftType,
                   TimeSlot  = @TimeSlot,
                   DutyTitle = @DutyTitle,
                   Name      = @Name,
                   Extension = @Extension,
                   Mobile    = @Mobile,
                   SortOrder = @SortOrder,
                   IsActive  = @IsActive
            WHERE  Id = @Id
            """;
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition(sql,
                new { req.UnitCode, req.ShiftType, req.TimeSlot, req.DutyTitle, req.Name,
                      req.Extension, req.Mobile, req.SortOrder, req.IsActive, Id = id },
                cancellationToken: ct));
        return rows > 0;
    }

    /// <summary>依 Id 實際刪除 [dbo].[DutyContact] 該筆資料（硬刪除），回傳是否有刪除成功。</summary>
    public async Task<bool> DeleteDutyAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[DutyContact] WHERE Id = @Id",
                new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── 常用電話 ──────────────────────────────────────────────────

    public async Task<IEnumerable<CommonContactItem>> GetCommonAsync(
        string unitCode, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = """
            SELECT Id, UnitCode, Name, Extension, SortOrder, IsActive
            FROM   [dbo].[CommonContact]
            WHERE  UnitCode = @UnitCode
              AND  (@IncludeAll = 1 OR IsActive = 1)
            ORDER  BY SortOrder, Id
            """;
        using var conn = _db.Create();
        return await conn.QueryAsync<CommonContactItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<CommonContactItem?> GetCommonByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<CommonContactItem>(
            new CommandDefinition("SELECT * FROM [dbo].[CommonContact] WHERE Id = @Id",
                new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateCommonAsync(CommonContactUpsertRequest req, CancellationToken ct = default)
    {
        var sql = """
            INSERT INTO [dbo].[CommonContact] (UnitCode, Name, Extension, SortOrder, IsActive)
            OUTPUT INSERTED.Id
            VALUES (@UnitCode, @Name, @Extension, @SortOrder, 1)
            """;
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateCommonAsync(int id, CommonContactUpsertRequest req, CancellationToken ct = default)
    {
        var sql = """
            UPDATE [dbo].[CommonContact]
            SET    UnitCode  = @UnitCode,
                   Name      = @Name,
                   Extension = @Extension,
                   SortOrder = @SortOrder,
                   IsActive  = @IsActive
            WHERE  Id = @Id
            """;
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition(sql,
                new { req.UnitCode, req.Name, req.Extension, req.SortOrder, req.IsActive, Id = id },
                cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteCommonAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[CommonContact] WHERE Id = @Id",
                new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }
}
