using Dapper;
using kmsh_whiteboard.Data;
using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

public interface IAuditRepository
{
    Task AddOperationAsync(OperationAuditItem item, CancellationToken ct = default);
    Task<(IEnumerable<OperationAuditItem> Rows, int Total)> GetOperationsAsync(
        DateTime? from, DateTime? to, string? empNo, int page, int pageSize, CancellationToken ct = default);
}

/// <summary>操作稽核資料層（dbo.OperationAudit，schema_v22）。</summary>
public class AuditRepository : IAuditRepository
{
    private readonly DbConnectionFactory _factory;
    public AuditRepository(DbConnectionFactory factory) => _factory = factory;

    public async Task AddOperationAsync(OperationAuditItem item, CancellationToken ct = default)
    {
        const string sql = @"
INSERT INTO dbo.OperationAudit (EmployeeNo, Name, Method, Path, Body, StatusCode, Ip)
VALUES (@EmployeeNo, @Name, @Method, @Path, @Body, @StatusCode, @Ip);";
        using var conn = _factory.Create();
        await conn.ExecuteAsync(new CommandDefinition(sql, item, cancellationToken: ct));
    }

    public async Task<(IEnumerable<OperationAuditItem> Rows, int Total)> GetOperationsAsync(
        DateTime? from, DateTime? to, string? empNo, int page, int pageSize, CancellationToken ct = default)
    {
        const string where = @"
WHERE (@From IS NULL OR CreatedAt >= @From)
  AND (@To   IS NULL OR CreatedAt <  @To)
  AND (@EmpNo IS NULL OR EmployeeNo = @EmpNo)";
        var p = new
        {
            From = from,
            To = to,
            EmpNo = string.IsNullOrWhiteSpace(empNo) ? null : empNo.Trim(),
            Offset = (page - 1) * pageSize,
            PageSize = pageSize,
        };
        using var conn = _factory.Create();
        var total = await conn.ExecuteScalarAsync<int>(new CommandDefinition(
            $"SELECT COUNT(*) FROM dbo.OperationAudit {where}", p, cancellationToken: ct));
        var rows = await conn.QueryAsync<OperationAuditItem>(new CommandDefinition($@"
SELECT Id, EmployeeNo, Name, Method, Path, Body, StatusCode, Ip, CreatedAt
FROM dbo.OperationAudit {where}
ORDER BY Id DESC
OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY", p, cancellationToken: ct));
        return (rows, total);
    }
}
