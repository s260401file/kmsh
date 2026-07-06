using Dapper;
using kmsh_whiteboard.Data;
using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>科別 Department ＋ 醫師 Doctor 主檔（Dapper，比照 WardRepository 的 CRUD 樣式）。</summary>
public class MasterDataRepository : IMasterDataRepository
{
    private readonly DbConnectionFactory _db;
    public MasterDataRepository(DbConnectionFactory db) => _db = db;

    // ── 科別 ─────────────────────────────────────────────
    private const string DeptCols = "Id, Code, Name, SortOrder, IsActive, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<DepartmentItem>> GetDepartmentsAsync(bool includeAll, CancellationToken ct = default)
    {
        var sql = $@"SELECT {DeptCols} FROM [dbo].[Department]
                     WHERE (@IncludeAll=1 OR IsActive=1) ORDER BY SortOrder, Code";
        using var conn = _db.Create();
        return await conn.QueryAsync<DepartmentItem>(
            new CommandDefinition(sql, new { IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<int> CreateDepartmentAsync(DepartmentUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[Department] (Code, Name, SortOrder, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@Code, @Name, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateDepartmentAsync(int id, DepartmentUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[Department] SET Code=@Code, Name=@Name, SortOrder=@SortOrder,
                        IsActive=@IsActive, UpdatedAt=GETDATE() WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql,
            new { req.Code, req.Name, req.SortOrder, req.IsActive, Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<(bool deleted, string? reason)> DeleteDepartmentAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var code = await conn.ExecuteScalarAsync<string?>(new CommandDefinition(
            "SELECT Code FROM [dbo].[Department] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        if (code is null) return (false, null);   // 查無此科別 → 交由端點回 404

        // 已被醫師使用則擋下（含停用醫師；避免孤兒科別代碼）
        var used = await conn.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(*) FROM [dbo].[Doctor] WHERE DeptCode=@Code", new { Code = code }, cancellationToken: ct));
        if (used > 0)
            return (false, $"此科別已有 {used} 位醫師使用，無法刪除；請先將這些醫師改為其他科別或移除。");

        await conn.ExecuteAsync(new CommandDefinition(
            "DELETE FROM [dbo].[Department] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return (true, null);
    }

    // ── 醫師 ─────────────────────────────────────────────
    public async Task<IEnumerable<DoctorItem>> GetDoctorsAsync(bool includeAll, string? deptCode, CancellationToken ct = default)
    {
        var sql = @"SELECT d.Id, d.EmployeeNo, d.Name, d.DeptCode, dep.Name AS DeptName,
                           d.Ext, d.SortOrder, d.IsActive, d.UpdatedAt, d.CreatedAt
                    FROM [dbo].[Doctor] d
                    LEFT JOIN [dbo].[Department] dep ON dep.Code = d.DeptCode
                    WHERE (@IncludeAll=1 OR d.IsActive=1)
                      AND (@DeptCode IS NULL OR d.DeptCode=@DeptCode)
                    ORDER BY d.SortOrder, d.Name";
        using var conn = _db.Create();
        return await conn.QueryAsync<DoctorItem>(new CommandDefinition(sql,
            new { IncludeAll = includeAll ? 1 : 0, DeptCode = deptCode }, cancellationToken: ct));
    }

    public async Task<int> CreateDoctorAsync(DoctorUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[Doctor] (EmployeeNo, Name, DeptCode, Ext, SortOrder, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@EmployeeNo, @Name, @DeptCode, @Ext, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateDoctorAsync(int id, DoctorUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[Doctor] SET EmployeeNo=@EmployeeNo, Name=@Name, DeptCode=@DeptCode,
                        Ext=@Ext, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE() WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql,
            new { req.EmployeeNo, req.Name, req.DeptCode, req.Ext, req.SortOrder, req.IsActive, Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteDoctorAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(
            "DELETE FROM [dbo].[Doctor] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }
}
