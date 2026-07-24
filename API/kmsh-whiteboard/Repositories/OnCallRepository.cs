using Dapper;
using kmsh_whiteboard.Data;
using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>
/// 各科值班醫師「每日輪值排程」資料存取（Dapper）：OnCallDept（科別設定）＋OnCallRoster（每日輪值）。
/// 全院共用（不綁 UnitCode）；月曆存檔採「先刪該科該月、再插入」覆寫語意。
/// </summary>
public class OnCallRepository : IOnCallRepository
{
    private readonly DbConnectionFactory _db;
    public OnCallRepository(DbConnectionFactory db) => _db = db;

    private const string DeptCols = "Id, DeptCode, DeptName, Slots, CallOutRule, Remark, HolidayContact, Ext, Mobile, SortOrder, IsActive, UpdatedAt, CreatedAt";
    private const string RosterCols = "Id, DeptCode, OnCallDate, Slot, DoctorName, Ext, Mobile, EmpNo, Note, SortOrder, IsActive, UpdatedAt, CreatedAt";

    // ── 科別設定 OnCallDept ──
    public async Task<IEnumerable<OnCallDeptItem>> GetDeptsAsync(bool includeAll = true, CancellationToken ct = default)
    {
        var sql = $@"SELECT {DeptCols} FROM [dbo].[OnCallDept]
                     WHERE (@IncludeAll=1 OR IsActive=1) ORDER BY SortOrder, Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<OnCallDeptItem>(new CommandDefinition(sql, new { IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<OnCallDeptItem?> GetDeptByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<OnCallDeptItem>(
            new CommandDefinition($"SELECT {DeptCols} FROM [dbo].[OnCallDept] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateDeptAsync(OnCallDeptUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[OnCallDept] (DeptCode, DeptName, Slots, CallOutRule, Remark, HolidayContact, Ext, Mobile, SortOrder, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@DeptCode, @DeptName, @Slots, @CallOutRule, @Remark, @HolidayContact, @Ext, @Mobile, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateDeptAsync(int id, OnCallDeptUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[OnCallDept] SET
                    DeptCode=@DeptCode, DeptName=@DeptName, Slots=@Slots, CallOutRule=@CallOutRule, Remark=@Remark,
                    HolidayContact=@HolidayContact, Ext=@Ext, Mobile=@Mobile, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE()
                    WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql,
            new { req.DeptCode, req.DeptName, req.Slots, req.CallOutRule, req.Remark, req.HolidayContact, req.Ext, req.Mobile, req.SortOrder, req.IsActive, Id = id },
            cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteDeptAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition("DELETE FROM [dbo].[OnCallDept] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── 每日輪值 OnCallRoster ──
    public async Task<IEnumerable<OnCallRosterItem>> GetRosterAsync(string? deptCode, DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var sql = $@"SELECT {RosterCols} FROM [dbo].[OnCallRoster]
                     WHERE IsActive=1
                       AND (@DeptCode IS NULL OR DeptCode=@DeptCode)
                       AND (@From IS NULL OR OnCallDate >= @From)
                       AND (@To IS NULL OR OnCallDate <= @To)
                     ORDER BY OnCallDate, DeptCode, SortOrder, Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<OnCallRosterItem>(new CommandDefinition(sql,
            new { DeptCode = deptCode, From = from, To = to }, cancellationToken: ct));
    }

    public async Task<IEnumerable<OnCallRosterItem>> GetDayAsync(DateTime date, CancellationToken ct = default)
    {
        var sql = $@"SELECT {RosterCols} FROM [dbo].[OnCallRoster]
                     WHERE IsActive=1 AND OnCallDate=@D ORDER BY DeptCode, SortOrder, Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<OnCallRosterItem>(new CommandDefinition(sql, new { D = date.Date }, cancellationToken: ct));
    }

    public async Task<int> CreateRosterAsync(OnCallRosterUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[OnCallRoster] (DeptCode, OnCallDate, Slot, DoctorName, Ext, Mobile, EmpNo, Note, SortOrder, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@DeptCode, @OnCallDate, @Slot, @DoctorName, @Ext, @Mobile, @EmpNo, @Note, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql,
            new { req.DeptCode, OnCallDate = DateTime.Parse(req.OnCallDate), req.Slot, req.DoctorName, req.Ext, req.Mobile, req.EmpNo, req.Note, req.SortOrder, req.IsActive },
            cancellationToken: ct));
    }

    public async Task<bool> UpdateRosterAsync(int id, OnCallRosterUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[OnCallRoster] SET
                    DeptCode=@DeptCode, OnCallDate=@OnCallDate, Slot=@Slot, DoctorName=@DoctorName, Ext=@Ext, Mobile=@Mobile,
                    EmpNo=@EmpNo, Note=@Note, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE()
                    WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql,
            new { req.DeptCode, OnCallDate = DateTime.Parse(req.OnCallDate), req.Slot, req.DoctorName, req.Ext, req.Mobile, req.EmpNo, req.Note, req.SortOrder, req.IsActive, Id = id },
            cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteRosterAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition("DELETE FROM [dbo].[OnCallRoster] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<int> SaveMonthAsync(OnCallMonthSaveRequest req, CancellationToken ct = default)
    {
        var monthStart = new DateTime(req.Year, req.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
        const string delSql = "DELETE FROM [dbo].[OnCallRoster] WHERE DeptCode=@Dept AND OnCallDate >= @Start AND OnCallDate <= @End";
        const string insSql = @"INSERT INTO [dbo].[OnCallRoster] (DeptCode, OnCallDate, Slot, DoctorName, Ext, Mobile, EmpNo, Note, SortOrder, IsActive, UpdatedAt, CreatedAt)
                                VALUES (@DeptCode, @OnCallDate, @Slot, @DoctorName, @Ext, @Mobile, @EmpNo, @Note, @SortOrder, 1, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        conn.Open();
        using var tx = conn.BeginTransaction();
        int n = 0;
        try
        {
            await conn.ExecuteAsync(new CommandDefinition(delSql, new { Dept = req.DeptCode, Start = monthStart, End = monthEnd }, tx, cancellationToken: ct));
            foreach (var e in req.Entries ?? new())
            {
                if (string.IsNullOrWhiteSpace(e.DoctorName)) continue;   // 空格不寫
                n += await conn.ExecuteAsync(new CommandDefinition(insSql,
                    new { req.DeptCode, OnCallDate = DateTime.Parse(e.OnCallDate), e.Slot, e.DoctorName, e.Ext, e.Mobile, e.EmpNo, e.Note, e.SortOrder },
                    tx, cancellationToken: ct));
            }
            tx.Commit();
        }
        catch { tx.Rollback(); throw; }
        return n;
    }

    // ── 各單位引用值班科別選取 UnitOnCallDept ──
    public async Task<IEnumerable<UnitOnCallDeptItem>> GetUnitDeptsAsync(string unitCode, CancellationToken ct = default)
    {
        var sql = @"SELECT u.Id, u.UnitCode, u.DeptCode, d.DeptName, u.SortOrder, u.IsActive, u.UpdatedAt, u.CreatedAt
                    FROM [dbo].[UnitOnCallDept] u
                    LEFT JOIN [dbo].[OnCallDept] d ON d.DeptCode = u.DeptCode
                    WHERE u.UnitCode=@UnitCode AND u.IsActive=1
                    ORDER BY u.SortOrder, u.Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<UnitOnCallDeptItem>(new CommandDefinition(sql, new { UnitCode = unitCode }, cancellationToken: ct));
    }

    /// <summary>覆寫某單位整組科別選取：交易內先刪該單位既有列、再依 entries 插入。回傳插入筆數。</summary>
    public async Task<int> SaveUnitDeptsAsync(string unitCode, IEnumerable<UnitOnCallDeptEntry> entries, CancellationToken ct = default)
    {
        const string delSql = "DELETE FROM [dbo].[UnitOnCallDept] WHERE UnitCode=@UnitCode";
        const string insSql = @"INSERT INTO [dbo].[UnitOnCallDept] (UnitCode, DeptCode, SortOrder, IsActive, UpdatedAt, CreatedAt)
                                VALUES (@UnitCode, @DeptCode, @SortOrder, 1, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        conn.Open();
        using var tx = conn.BeginTransaction();
        int n = 0;
        try
        {
            await conn.ExecuteAsync(new CommandDefinition(delSql, new { UnitCode = unitCode }, tx, cancellationToken: ct));
            var seen = new HashSet<string>();
            foreach (var e in entries ?? Enumerable.Empty<UnitOnCallDeptEntry>())
            {
                if (string.IsNullOrWhiteSpace(e.DeptCode) || !seen.Add(e.DeptCode)) continue;   // 空/重複略過（UNIQUE 保護）
                n += await conn.ExecuteAsync(new CommandDefinition(insSql,
                    new { UnitCode = unitCode, DeptCode = e.DeptCode.Trim(), e.SortOrder }, tx, cancellationToken: ct));
            }
            tx.Commit();
        }
        catch { tx.Rollback(); throw; }
        return n;
    }

    // ── 夜/假護理師值班表 NightNurseRoster ──
    private const string NnrCols = "Id, OnCallDate, Slot, Name, SortOrder, IsActive";

    public async Task<IEnumerable<NightNurseItem>> GetNightNurseAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        var sql = $@"SELECT {NnrCols} FROM [dbo].[NightNurseRoster]
                     WHERE IsActive=1 AND OnCallDate >= @From AND OnCallDate <= @To
                     ORDER BY OnCallDate, SortOrder, Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<NightNurseItem>(
            new CommandDefinition(sql, new { From = from.Date, To = to.Date }, cancellationToken: ct));
    }

    /// <summary>覆寫某月夜/假護理師：交易內先刪該月既有列、再插入 entries（姓名空白略過）。回傳插入筆數。</summary>
    public async Task<int> SaveNightNurseMonthAsync(NightNurseMonthSaveRequest req, CancellationToken ct = default)
    {
        var monthStart = new DateTime(req.Year, req.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
        const string delSql = "DELETE FROM [dbo].[NightNurseRoster] WHERE OnCallDate >= @Start AND OnCallDate <= @End";
        const string insSql = @"INSERT INTO [dbo].[NightNurseRoster] (OnCallDate, Slot, Name, SortOrder, IsActive, UpdatedAt, CreatedAt)
                                VALUES (@OnCallDate, @Slot, @Name, @SortOrder, 1, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        conn.Open();
        using var tx = conn.BeginTransaction();
        int n = 0;
        try
        {
            await conn.ExecuteAsync(new CommandDefinition(delSql, new { Start = monthStart, End = monthEnd }, tx, cancellationToken: ct));
            foreach (var e in req.Entries ?? new())
            {
                if (string.IsNullOrWhiteSpace(e.Name)) continue;   // 空格不寫
                n += await conn.ExecuteAsync(new CommandDefinition(insSql,
                    new { OnCallDate = DateTime.Parse(e.OnCallDate).Date, Slot = e.Slot ?? "", Name = e.Name!.Trim(), e.SortOrder },
                    tx, cancellationToken: ct));
            }
            tx.Commit();
        }
        catch { tx.Rollback(); throw; }
        return n;
    }

    // ── 護理行政值班表 AdminDutyRoster ──
    private const string AdrCols = "Id, OnCallDate, Slot, Name, SortOrder, IsActive";

    public async Task<IEnumerable<AdminDutyItem>> GetAdminDutyAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        var sql = $@"SELECT {AdrCols} FROM [dbo].[AdminDutyRoster]
                     WHERE IsActive=1 AND OnCallDate >= @From AND OnCallDate <= @To
                     ORDER BY OnCallDate, SortOrder, Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<AdminDutyItem>(
            new CommandDefinition(sql, new { From = from.Date, To = to.Date }, cancellationToken: ct));
    }

    /// <summary>覆寫某月護理行政值班：交易內先刪該月既有列、再插入 entries（姓名空白略過）。回傳插入筆數。</summary>
    public async Task<int> SaveAdminDutyMonthAsync(AdminDutyMonthSaveRequest req, CancellationToken ct = default)
    {
        var monthStart = new DateTime(req.Year, req.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
        const string delSql = "DELETE FROM [dbo].[AdminDutyRoster] WHERE OnCallDate >= @Start AND OnCallDate <= @End";
        const string insSql = @"INSERT INTO [dbo].[AdminDutyRoster] (OnCallDate, Slot, Name, SortOrder, IsActive, UpdatedAt, CreatedAt)
                                VALUES (@OnCallDate, @Slot, @Name, @SortOrder, 1, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        conn.Open();
        using var tx = conn.BeginTransaction();
        int n = 0;
        try
        {
            await conn.ExecuteAsync(new CommandDefinition(delSql, new { Start = monthStart, End = monthEnd }, tx, cancellationToken: ct));
            foreach (var e in req.Entries ?? new())
            {
                if (string.IsNullOrWhiteSpace(e.Name)) continue;   // 空格不寫
                n += await conn.ExecuteAsync(new CommandDefinition(insSql,
                    new { OnCallDate = DateTime.Parse(e.OnCallDate).Date, Slot = e.Slot ?? "", Name = e.Name!.Trim(), e.SortOrder },
                    tx, cancellationToken: ct));
            }
            tx.Commit();
        }
        catch { tx.Rollback(); throw; }
        return n;
    }
}
