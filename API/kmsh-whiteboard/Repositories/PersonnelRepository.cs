using Dapper;
using kmsh_whiteboard.Data;
using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>人員管理資料存取（Dapper）：操作 Staff / StaffUnitRole / StaffSchedule /
/// BedStaffAssignment / DoctorRound / HandoverShift / HandoverPatient / HandoverItem。</summary>
public class PersonnelRepository : IPersonnelRepository
{
    private readonly DbConnectionFactory _db;
    public PersonnelRepository(DbConnectionFactory db) => _db = db;

    // ── 人員主檔 ──────────────────────────────────────────────
    private const string StaffCols = "Id, EmployeeNo, Name, Ext, Mobile, IsAdmin, IsActive, SortOrder, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<StaffItem>> GetStaffAsync(bool includeAll = true, CancellationToken ct = default)
    {
        var sql = $@"SELECT {StaffCols} FROM [dbo].[Staff]
                     WHERE (@IncludeAll=1 OR IsActive=1) ORDER BY SortOrder, EmployeeNo";
        using var conn = _db.Create();
        return await conn.QueryAsync<StaffItem>(new CommandDefinition(sql, new { IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<StaffItem?> GetStaffByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<StaffItem>(
            new CommandDefinition($"SELECT {StaffCols} FROM [dbo].[Staff] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
    }

    public async Task<StaffItem?> GetStaffByEmployeeNoAsync(string employeeNo, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<StaffItem>(
            new CommandDefinition($"SELECT {StaffCols} FROM [dbo].[Staff] WHERE EmployeeNo=@No AND IsActive=1", new { No = employeeNo }, cancellationToken: ct));
    }

    public async Task AddLoginAuditAsync(string? employeeNo, bool success, string? ip, string @event, CancellationToken ct = default)
    {
        const string sql = @"INSERT INTO [dbo].[LoginAudit] (EmployeeNo, Success, [Event], Ip, CreatedAt)
                             VALUES (@EmployeeNo, @Success, @Event, @Ip, GETDATE())";
        using var conn = _db.Create();
        await conn.ExecuteAsync(new CommandDefinition(sql,
            new { EmployeeNo = employeeNo, Success = success, Event = @event, Ip = ip }, cancellationToken: ct));
    }

    public async Task<int> CreateStaffAsync(StaffUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[Staff] (EmployeeNo, Name, Ext, Mobile, IsAdmin, IsActive, SortOrder, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@EmployeeNo, @Name, @Ext, @Mobile, @IsAdmin, @IsActive, @SortOrder, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateStaffAsync(int id, StaffUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[Staff] SET EmployeeNo=@EmployeeNo, Name=@Name, Ext=@Ext, Mobile=@Mobile,
                    IsAdmin=@IsAdmin, IsActive=@IsActive, SortOrder=@SortOrder, UpdatedAt=GETDATE() WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.EmployeeNo, req.Name, req.Ext, req.Mobile, req.IsAdmin, req.IsActive, req.SortOrder, Id = id
        }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteStaffAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        // 連帶清除該人員的單位角色（其餘排班/指派以軟關聯保留歷史）
        var rows = await conn.ExecuteAsync(new CommandDefinition(
            "DELETE FROM [dbo].[StaffUnitRole] WHERE StaffId=@Id; DELETE FROM [dbo].[Staff] WHERE Id=@Id;",
            new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── 人員×單位×角色 ─────────────────────────────────────────
    private const string SurCols = @"sur.Id, sur.StaffId, sur.UnitCode, sur.Role, sur.Department, sur.IsManager,
        sur.GroupKey, sur.SortOrder, sur.IsActive, sur.UpdatedAt, sur.CreatedAt,
        s.EmployeeNo, s.Name, s.Ext, s.Mobile";

    public async Task<IEnumerable<StaffUnitRoleItem>> GetUnitRolesAsync(int? staffId = null, string? unitCode = null, bool includeAll = true, CancellationToken ct = default)
    {
        var sql = $@"SELECT {SurCols} FROM [dbo].[StaffUnitRole] sur
                     JOIN [dbo].[Staff] s ON s.Id = sur.StaffId
                     WHERE (@StaffId IS NULL OR sur.StaffId=@StaffId)
                       AND (@UnitCode IS NULL OR sur.UnitCode=@UnitCode)
                       AND (@IncludeAll=1 OR (sur.IsActive=1 AND s.IsActive=1))
                     ORDER BY sur.UnitCode, sur.SortOrder, s.SortOrder";
        using var conn = _db.Create();
        return await conn.QueryAsync<StaffUnitRoleItem>(new CommandDefinition(sql,
            new { StaffId = staffId, UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<StaffUnitRoleItem?> GetUnitRoleByIdAsync(int id, CancellationToken ct = default)
    {
        var sql = $@"SELECT {SurCols} FROM [dbo].[StaffUnitRole] sur
                     JOIN [dbo].[Staff] s ON s.Id = sur.StaffId WHERE sur.Id=@Id";
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<StaffUnitRoleItem>(new CommandDefinition(sql, new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateUnitRoleAsync(StaffUnitRoleUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[StaffUnitRole] (StaffId, UnitCode, Role, Department, IsManager, GroupKey, SortOrder, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@StaffId, @UnitCode, @Role, @Department, @IsManager, @GroupKey, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateUnitRoleAsync(int id, StaffUnitRoleUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[StaffUnitRole] SET StaffId=@StaffId, UnitCode=@UnitCode, Role=@Role, Department=@Department,
                    IsManager=@IsManager, GroupKey=@GroupKey, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE() WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.StaffId, req.UnitCode, req.Role, req.Department, req.IsManager, req.GroupKey, req.SortOrder, req.IsActive, Id = id
        }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteUnitRoleAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition("DELETE FROM [dbo].[StaffUnitRole] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── 排班 ─────────────────────────────────────────────────
    private const string SchCols = @"sch.Id, sch.StaffId, sch.UnitCode, sch.WorkDate, sch.Shift, sch.EmergencyGroup,
        sch.IsCharge, sch.Note, sch.SortOrder, sch.IsActive, sch.UpdatedAt, sch.CreatedAt,
        s.EmployeeNo, s.Name, s.Ext,
        r.Role, r.Department";
    // 取該人員在該單位的首個角色（OUTER APPLY 避免多角色重複列）
    private const string SchFrom = @"FROM [dbo].[StaffSchedule] sch
        JOIN [dbo].[Staff] s ON s.Id = sch.StaffId
        OUTER APPLY (SELECT TOP 1 Role, Department FROM [dbo].[StaffUnitRole]
                     WHERE StaffId = sch.StaffId AND UnitCode = sch.UnitCode AND IsActive=1
                     ORDER BY SortOrder, Id) r";

    public async Task<IEnumerable<StaffScheduleItem>> GetScheduleAsync(string unitCode, string? date = null, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = $@"SELECT {SchCols} {SchFrom}
                     WHERE sch.UnitCode=@UnitCode AND (@Date IS NULL OR sch.WorkDate=@Date)
                       AND (@IncludeAll=1 OR sch.IsActive=1)
                     ORDER BY sch.Shift, sch.SortOrder, s.SortOrder";
        using var conn = _db.Create();
        return await conn.QueryAsync<StaffScheduleItem>(new CommandDefinition(sql,
            new { UnitCode = unitCode, Date = date, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<StaffScheduleItem?> GetScheduleByIdAsync(int id, CancellationToken ct = default)
    {
        var sql = $"SELECT {SchCols} {SchFrom} WHERE sch.Id=@Id";
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<StaffScheduleItem>(new CommandDefinition(sql, new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateScheduleAsync(StaffScheduleUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[StaffSchedule] (StaffId, UnitCode, WorkDate, Shift, EmergencyGroup, IsCharge, Note, SortOrder, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@StaffId, @UnitCode, @WorkDate, @Shift, @EmergencyGroup, @IsCharge, @Note, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateScheduleAsync(int id, StaffScheduleUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[StaffSchedule] SET StaffId=@StaffId, UnitCode=@UnitCode, WorkDate=@WorkDate, Shift=@Shift,
                    EmergencyGroup=@EmergencyGroup, IsCharge=@IsCharge, Note=@Note, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE() WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.StaffId, req.UnitCode, req.WorkDate, req.Shift, req.EmergencyGroup, req.IsCharge, req.Note, req.SortOrder, req.IsActive, Id = id
        }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteScheduleAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition("DELETE FROM [dbo].[StaffSchedule] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    /// <summary>
    /// 值班表三班護理師批次排班：日期區間 [from,to] 每一天 × 各班 × 有序護理師，做「疊加」。
    /// 每個 (Unit,Date,Shift)：既有列<b>保留原順序不動</b>；未在名單者<b>依點選順序接在最後</b>
    /// （SortOrder＝該班現有 MAX 之後遞增）。已存在者略過。不刪除任何既有列。單一交易。
    /// </summary>
    public async Task<int> AddShiftRosterAsync(string unitCode, DateTime from, DateTime to,
        IReadOnlyList<(string shift, IReadOnlyList<int> staffIds)> shifts, CancellationToken ct = default)
    {
        if (to < from) (from, to) = (to, from);
        const string existSql = "SELECT StaffId FROM [dbo].[StaffSchedule] WHERE UnitCode=@U AND WorkDate=@D AND Shift=@S";
        const string maxSql = "SELECT MAX(SortOrder) FROM [dbo].[StaffSchedule] WHERE UnitCode=@U AND WorkDate=@D AND Shift=@S";
        const string insSql = @"INSERT INTO [dbo].[StaffSchedule] (StaffId, UnitCode, WorkDate, Shift, SortOrder, IsActive, UpdatedAt, CreatedAt)
                                VALUES (@StaffId, @UnitCode, @WorkDate, @Shift, @SortOrder, 1, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        conn.Open();
        using var tx = conn.BeginTransaction();
        int n = 0;
        try
        {
            for (var d = from.Date; d <= to.Date; d = d.AddDays(1))
                foreach (var (shift, ids) in shifts)
                {
                    var p = new { U = unitCode, D = d, S = shift };
                    var existing = (await conn.QueryAsync<int>(new CommandDefinition(existSql, p, tx, cancellationToken: ct))).ToHashSet();
                    var order = await conn.ExecuteScalarAsync<int?>(new CommandDefinition(maxSql, p, tx, cancellationToken: ct)) ?? 0;
                    foreach (var staffId in ids ?? (IReadOnlyList<int>)Array.Empty<int>())
                    {
                        if (!existing.Add(staffId)) continue;   // 已在該班→保留原序、不重複
                        order++;                                 // 接在最後
                        n += await conn.ExecuteAsync(new CommandDefinition(insSql,
                            new { StaffId = staffId, UnitCode = unitCode, WorkDate = d, Shift = shift, SortOrder = order },
                            tx, cancellationToken: ct));
                    }
                }
            tx.Commit();
        }
        catch { tx.Rollback(); throw; }
        return n;
    }

    // ── 床位指派 ───────────────────────────────────────────────
    private const string BsaCols = @"bsa.Id, bsa.UnitCode, bsa.BedId, bsa.WorkDate, bsa.Shift, bsa.StaffId, bsa.AssignType,
        bsa.SortOrder, bsa.IsActive, bsa.UpdatedAt, bsa.CreatedAt, s.EmployeeNo, s.Name";

    public async Task<IEnumerable<BedStaffAssignmentItem>> GetBedAssignAsync(string unitCode, string? date = null, string? assignType = null, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = $@"SELECT {BsaCols} FROM [dbo].[BedStaffAssignment] bsa
                     JOIN [dbo].[Staff] s ON s.Id = bsa.StaffId
                     WHERE bsa.UnitCode=@UnitCode AND (@Date IS NULL OR bsa.WorkDate=@Date)
                       AND (@AssignType IS NULL OR bsa.AssignType=@AssignType)
                       AND (@IncludeAll=1 OR bsa.IsActive=1)
                     ORDER BY bsa.AssignType, bsa.SortOrder, bsa.BedId";
        using var conn = _db.Create();
        return await conn.QueryAsync<BedStaffAssignmentItem>(new CommandDefinition(sql,
            new { UnitCode = unitCode, Date = date, AssignType = assignType, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<BedStaffAssignmentItem?> GetBedAssignByIdAsync(int id, CancellationToken ct = default)
    {
        var sql = $@"SELECT {BsaCols} FROM [dbo].[BedStaffAssignment] bsa
                     JOIN [dbo].[Staff] s ON s.Id = bsa.StaffId WHERE bsa.Id=@Id";
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<BedStaffAssignmentItem>(new CommandDefinition(sql, new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateBedAssignAsync(BedStaffAssignmentUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[BedStaffAssignment] (UnitCode, BedId, WorkDate, Shift, StaffId, AssignType, SortOrder, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@UnitCode, @BedId, @WorkDate, @Shift, @StaffId, @AssignType, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateBedAssignAsync(int id, BedStaffAssignmentUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[BedStaffAssignment] SET UnitCode=@UnitCode, BedId=@BedId, WorkDate=@WorkDate, Shift=@Shift,
                    StaffId=@StaffId, AssignType=@AssignType, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE() WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.UnitCode, req.BedId, req.WorkDate, req.Shift, req.StaffId, req.AssignType, req.SortOrder, req.IsActive, Id = id
        }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteBedAssignAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition("DELETE FROM [dbo].[BedStaffAssignment] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task SetBedNurseAsync(string unitCode, int staffId, string date, IEnumerable<string> bedIds, CancellationToken ct = default)
    {
        var csv = string.Join(",", (bedIds ?? Enumerable.Empty<string>()).Select(b => b?.Trim()).Where(b => !string.IsNullOrEmpty(b)));
        // W52／ICU／ER 皆允許一床多位護理師（跨班/帶教）→ 略過步驟②（移除他人同床）。
        var multiBed = unitCode.Equals("W52", StringComparison.OrdinalIgnoreCase)
            || unitCode.Equals("ICU", StringComparison.OrdinalIgnoreCase)
            || unitCode.Equals("ER", StringComparison.OrdinalIgnoreCase);
        var stripOthers = multiBed ? "" : @"
DELETE FROM [dbo].[BedStaffAssignment]
 WHERE UnitCode=@Unit AND WorkDate=@Date AND AssignType=N'主護' AND StaffId<>@StaffId
   AND BedId IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@Csv, ',') WHERE value<>'');";
        // 交易：① 移除該員取消勾選的主護床 ②（非 W52）移除所選床上其他人的主護 ③ 補插該員缺的床
        var sql = $@"
SET XACT_ABORT ON;
BEGIN TRAN;
DELETE FROM [dbo].[BedStaffAssignment]
 WHERE UnitCode=@Unit AND WorkDate=@Date AND AssignType=N'主護' AND StaffId=@StaffId
   AND BedId NOT IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@Csv, ',') WHERE value<>'');{stripOthers}
INSERT INTO [dbo].[BedStaffAssignment] (UnitCode, BedId, WorkDate, Shift, StaffId, AssignType, SortOrder, IsActive, UpdatedAt, CreatedAt)
SELECT @Unit, LTRIM(RTRIM(s.value)), @Date, NULL, @StaffId, N'主護', 0, 1, GETDATE(), GETDATE()
FROM STRING_SPLIT(@Csv, ',') s
WHERE s.value<>'' AND NOT EXISTS (
  SELECT 1 FROM [dbo].[BedStaffAssignment] b
  WHERE b.UnitCode=@Unit AND b.WorkDate=@Date AND b.AssignType=N'主護' AND b.StaffId=@StaffId AND b.BedId=LTRIM(RTRIM(s.value)));
COMMIT;";
        using var conn = _db.Create();
        await conn.ExecuteAsync(new CommandDefinition(sql, new { Unit = unitCode, StaffId = staffId, Date = date, Csv = csv }, cancellationToken: ct));
    }

    // ── 查房表 ─────────────────────────────────────────────────
    private const string DrCols = @"Id, UnitCode, RoundDate, StaffId, DoctorName, Specialty, EstimatedTime, ActualTime,
        IsCompleted, Remark, SortOrder, IsActive, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<DoctorRoundItem>> GetRoundAsync(string unitCode, string? date = null, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = $@"SELECT {DrCols} FROM [dbo].[DoctorRound]
                     WHERE UnitCode=@UnitCode AND (@Date IS NULL OR RoundDate=@Date)
                       AND (@IncludeAll=1 OR IsActive=1)
                     ORDER BY SortOrder, EstimatedTime, Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<DoctorRoundItem>(new CommandDefinition(sql,
            new { UnitCode = unitCode, Date = date, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<DoctorRoundItem?> GetRoundByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<DoctorRoundItem>(
            new CommandDefinition($"SELECT {DrCols} FROM [dbo].[DoctorRound] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateRoundAsync(DoctorRoundUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[DoctorRound] (UnitCode, RoundDate, StaffId, DoctorName, Specialty, EstimatedTime, ActualTime, IsCompleted, Remark, SortOrder, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@UnitCode, @RoundDate, @StaffId, @DoctorName, @Specialty, @EstimatedTime, @ActualTime, @IsCompleted, @Remark, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateRoundAsync(int id, DoctorRoundUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[DoctorRound] SET UnitCode=@UnitCode, RoundDate=@RoundDate, StaffId=@StaffId, DoctorName=@DoctorName,
                    Specialty=@Specialty, EstimatedTime=@EstimatedTime, ActualTime=@ActualTime, IsCompleted=@IsCompleted,
                    Remark=@Remark, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE() WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.UnitCode, req.RoundDate, req.StaffId, req.DoctorName, req.Specialty, req.EstimatedTime, req.ActualTime,
            req.IsCompleted, req.Remark, req.SortOrder, req.IsActive, Id = id
        }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteRoundAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition("DELETE FROM [dbo].[DoctorRound] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── 護理交班 header ────────────────────────────────────────
    private const string HsCols = @"Id, UnitCode, WorkDate, FromShift, FromShiftTime, ToShift, ToShiftTime, HandoverTime,
        FromStaffIds, ToStaffIds, IsActive, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<HandoverShiftItem>> GetHandoverShiftsAsync(string unitCode, string? date = null, string? shift = null, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = $@"SELECT {HsCols} FROM [dbo].[HandoverShift]
                     WHERE UnitCode=@UnitCode AND (@Date IS NULL OR WorkDate=@Date)
                       AND (@Shift IS NULL OR FromShift=@Shift)
                       AND (@IncludeAll=1 OR IsActive=1)
                     ORDER BY WorkDate DESC, Id DESC";
        using var conn = _db.Create();
        return await conn.QueryAsync<HandoverShiftItem>(new CommandDefinition(sql,
            new { UnitCode = unitCode, Date = date, Shift = shift, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<HandoverShiftItem?> GetHandoverShiftByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<HandoverShiftItem>(
            new CommandDefinition($"SELECT {HsCols} FROM [dbo].[HandoverShift] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateHandoverShiftAsync(HandoverShiftUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[HandoverShift] (UnitCode, WorkDate, FromShift, FromShiftTime, ToShift, ToShiftTime, HandoverTime, FromStaffIds, ToStaffIds, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@UnitCode, @WorkDate, @FromShift, @FromShiftTime, @ToShift, @ToShiftTime, @HandoverTime, @FromStaffIds, @ToStaffIds, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateHandoverShiftAsync(int id, HandoverShiftUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[HandoverShift] SET UnitCode=@UnitCode, WorkDate=@WorkDate, FromShift=@FromShift, FromShiftTime=@FromShiftTime,
                    ToShift=@ToShift, ToShiftTime=@ToShiftTime, HandoverTime=@HandoverTime, FromStaffIds=@FromStaffIds, ToStaffIds=@ToStaffIds,
                    IsActive=@IsActive, UpdatedAt=GETDATE() WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.UnitCode, req.WorkDate, req.FromShift, req.FromShiftTime, req.ToShift, req.ToShiftTime, req.HandoverTime,
            req.FromStaffIds, req.ToStaffIds, req.IsActive, Id = id
        }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteHandoverShiftAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        // 連帶刪除其下病人卡與事項
        var sql = @"DELETE FROM [dbo].[HandoverItem] WHERE HandoverPatientId IN
                      (SELECT Id FROM [dbo].[HandoverPatient] WHERE HandoverShiftId=@Id);
                    DELETE FROM [dbo].[HandoverPatient] WHERE HandoverShiftId=@Id;
                    DELETE FROM [dbo].[HandoverShift] WHERE Id=@Id;";
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── 護理交班-病人卡 ────────────────────────────────────────
    private const string HpCols = "Id, HandoverShiftId, BedNo, Hhisnum, PatientName, Gender, Age, Diagnosis, Priority, SortOrder, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<HandoverPatientItem>> GetHandoverPatientsAsync(int shiftId, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryAsync<HandoverPatientItem>(new CommandDefinition(
            $"SELECT {HpCols} FROM [dbo].[HandoverPatient] WHERE HandoverShiftId=@Sid ORDER BY SortOrder, Id",
            new { Sid = shiftId }, cancellationToken: ct));
    }

    public async Task<int> CreateHandoverPatientAsync(HandoverPatientUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[HandoverPatient] (HandoverShiftId, BedNo, Hhisnum, PatientName, Gender, Age, Diagnosis, Priority, SortOrder, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@HandoverShiftId, @BedNo, @Hhisnum, @PatientName, @Gender, @Age, @Diagnosis, @Priority, @SortOrder, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateHandoverPatientAsync(int id, HandoverPatientUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[HandoverPatient] SET HandoverShiftId=@HandoverShiftId, BedNo=@BedNo, Hhisnum=@Hhisnum, PatientName=@PatientName,
                    Gender=@Gender, Age=@Age, Diagnosis=@Diagnosis, Priority=@Priority, SortOrder=@SortOrder, UpdatedAt=GETDATE() WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.HandoverShiftId, req.BedNo, req.Hhisnum, req.PatientName, req.Gender, req.Age, req.Diagnosis, req.Priority, req.SortOrder, Id = id
        }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteHandoverPatientAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(
            "DELETE FROM [dbo].[HandoverItem] WHERE HandoverPatientId=@Id; DELETE FROM [dbo].[HandoverPatient] WHERE Id=@Id;",
            new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── 護理交班-事項 ──────────────────────────────────────────
    private const string HiCols = "Id, HandoverPatientId, Category, Content, SortOrder, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<HandoverNoteItem>> GetHandoverNotesAsync(int patientId, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryAsync<HandoverNoteItem>(new CommandDefinition(
            $"SELECT {HiCols} FROM [dbo].[HandoverItem] WHERE HandoverPatientId=@Pid ORDER BY SortOrder, Id",
            new { Pid = patientId }, cancellationToken: ct));
    }

    public async Task<int> CreateHandoverNoteAsync(HandoverNoteUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[HandoverItem] (HandoverPatientId, Category, Content, SortOrder, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id VALUES (@HandoverPatientId, @Category, @Content, @SortOrder, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateHandoverNoteAsync(int id, HandoverNoteUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[HandoverItem] SET HandoverPatientId=@HandoverPatientId, Category=@Category, Content=@Content,
                    SortOrder=@SortOrder, UpdatedAt=GETDATE() WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.HandoverPatientId, req.Category, req.Content, req.SortOrder, Id = id
        }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteHandoverNoteAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition("DELETE FROM [dbo].[HandoverItem] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }
}
