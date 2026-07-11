using Dapper;
using kmsh_whiteboard.Data;
using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>
/// 病室動態臨床補充層資料存取（Dapper）：操作自建白板 DB 的 [dbo].[WardPatientExt]。
/// 一病人一列（UnitCode＋Hhisnum），補 Board_bed 不足的臨床欄位；供看板聚合與後台 CRUD。
/// </summary>
public class WardRepository : IWardRepository
{
    private readonly DbConnectionFactory _db;
    public WardRepository(DbConnectionFactory db) => _db = db;

    private const string Cols = @"Id, UnitCode, Hhisnum, Department, AttendingDoctor, PrimaryNurse, Diagnosis,
        Condition, BedStatus, AdmissionDate, Dnr, Isolation, FallRisk, Dependency, Confidential, NoTreatment,
        Npo, Allergy, Rrt, Chemo, Transport, Oxygen, Renal, PortCath, DLVC, Foley, CVC, CardiacCath,
        Ventilator, Crrt, Ng, Surgery, Exam, Consult, Notes,
        Observation, Awaiting, AwaitingType, TransferIn, TransferOut, TransferHospital, TransferInHospital, Admitted, AdmBedNo,
        Aad, Mbd, Deceased, ArrivalDate, ArrivalTime,
        ScrubNurse, CircNurse, SurgeryStatus, StartTime, EndTime,
        IsActive, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<WardPatientExtItem>> GetExtAsync(string unitCode, bool includeAll = true, CancellationToken ct = default)
    {
        var sql = $@"SELECT {Cols} FROM [dbo].[WardPatientExt]
                     WHERE UnitCode = @UnitCode AND (@IncludeAll = 1 OR IsActive = 1)
                     ORDER BY Hhisnum";
        using var conn = _db.Create();
        return await conn.QueryAsync<WardPatientExtItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<WardPatientExtItem?> GetExtByIdAsync(int id, CancellationToken ct = default)
    {
        var sql = $"SELECT {Cols} FROM [dbo].[WardPatientExt] WHERE Id = @Id";
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<WardPatientExtItem>(
            new CommandDefinition(sql, new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateExtAsync(WardPatientExtUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[WardPatientExt]
            (UnitCode, Hhisnum, Department, AttendingDoctor, PrimaryNurse, Diagnosis, Condition, BedStatus,
             AdmissionDate, Dnr, Isolation, FallRisk, Dependency, Confidential, NoTreatment, Npo, Allergy,
             Rrt, Chemo, Transport, Oxygen, Renal, PortCath, DLVC, Foley, CVC, CardiacCath,
             Ventilator, Crrt, Ng, Surgery, Exam, Consult, Notes,
             Observation, Awaiting, AwaitingType, TransferIn, TransferOut, TransferHospital, TransferInHospital, Admitted, AdmBedNo,
             Aad, Mbd, Deceased, ArrivalDate, ArrivalTime,
             ScrubNurse, CircNurse, SurgeryStatus, StartTime, EndTime,
             IsActive, UpdatedAt, CreatedAt)
            OUTPUT INSERTED.Id
            VALUES
            (@UnitCode, @Hhisnum, @Department, @AttendingDoctor, @PrimaryNurse, @Diagnosis, @Condition, @BedStatus,
             @AdmissionDate, @Dnr, @Isolation, @FallRisk, @Dependency, @Confidential, @NoTreatment, @Npo, @Allergy,
             @Rrt, @Chemo, @Transport, @Oxygen, @Renal, @PortCath, @DLVC, @Foley, @CVC, @CardiacCath,
             @Ventilator, @Crrt, @Ng, @Surgery, @Exam, @Consult, @Notes,
             @Observation, @Awaiting, @AwaitingType, @TransferIn, @TransferOut, @TransferHospital, @TransferInHospital, @Admitted, @AdmBedNo,
             @Aad, @Mbd, @Deceased, @ArrivalDate, @ArrivalTime,
             @ScrubNurse, @CircNurse, @SurgeryStatus, @StartTime, @EndTime,
             @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateExtAsync(int id, WardPatientExtUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[WardPatientExt] SET
            UnitCode=@UnitCode, Hhisnum=@Hhisnum, Department=@Department, AttendingDoctor=@AttendingDoctor,
            PrimaryNurse=@PrimaryNurse, Diagnosis=@Diagnosis, Condition=@Condition, BedStatus=@BedStatus,
            AdmissionDate=@AdmissionDate, Dnr=@Dnr, Isolation=@Isolation, FallRisk=@FallRisk, Dependency=@Dependency,
            Confidential=@Confidential, NoTreatment=@NoTreatment, Npo=@Npo, Allergy=@Allergy, Rrt=@Rrt, Chemo=@Chemo,
            Transport=@Transport, Oxygen=@Oxygen, Renal=@Renal, PortCath=@PortCath, DLVC=@DLVC, Foley=@Foley,
            CVC=@CVC, CardiacCath=@CardiacCath, Ventilator=@Ventilator, Crrt=@Crrt, Ng=@Ng,
            Surgery=@Surgery, Exam=@Exam, Consult=@Consult, Notes=@Notes,
            Observation=@Observation, Awaiting=@Awaiting, AwaitingType=@AwaitingType, TransferIn=@TransferIn,
            TransferOut=@TransferOut, TransferHospital=@TransferHospital, TransferInHospital=@TransferInHospital, Admitted=@Admitted, AdmBedNo=@AdmBedNo,
            Aad=@Aad, Mbd=@Mbd, Deceased=@Deceased, ArrivalDate=@ArrivalDate, ArrivalTime=@ArrivalTime,
            ScrubNurse=@ScrubNurse, CircNurse=@CircNurse, SurgeryStatus=@SurgeryStatus, StartTime=@StartTime, EndTime=@EndTime,
            IsActive=@IsActive, UpdatedAt=GETDATE()
            WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.UnitCode, req.Hhisnum, req.Department, req.AttendingDoctor, req.PrimaryNurse, req.Diagnosis,
            req.Condition, req.BedStatus, req.AdmissionDate, req.Dnr, req.Isolation, req.FallRisk, req.Dependency,
            req.Confidential, req.NoTreatment, req.Npo, req.Allergy, req.Rrt, req.Chemo, req.Transport, req.Oxygen,
            req.Renal, req.PortCath, req.DLVC, req.Foley, req.CVC, req.CardiacCath, req.Ventilator, req.Crrt, req.Ng,
            req.Surgery, req.Exam, req.Consult, req.Notes,
            req.Observation, req.Awaiting, req.AwaitingType, req.TransferIn, req.TransferOut, req.TransferHospital, req.TransferInHospital,
            req.Admitted, req.AdmBedNo, req.Aad, req.Mbd, req.Deceased, req.ArrivalDate, req.ArrivalTime,
            req.ScrubNurse, req.CircNurse, req.SurgeryStatus, req.StartTime, req.EndTime,
            req.IsActive, Id = id
        }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteExtAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[WardPatientExt] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── 各科值班醫師 ───────────────────────────────────────────────
    private const string OcCols = "Id, UnitCode, DeptCode, DeptName, DoctorName, Ext, EmpNo, SortOrder, IsActive, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<ErOnCallDoctorItem>> GetOnCallAsync(string unitCode, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = $@"SELECT {OcCols} FROM [dbo].[ErOnCallDoctor]
                     WHERE UnitCode=@UnitCode AND (@IncludeAll=1 OR IsActive=1)
                     ORDER BY SortOrder, Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<ErOnCallDoctorItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<ErOnCallDoctorItem?> GetOnCallByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<ErOnCallDoctorItem>(
            new CommandDefinition($"SELECT {OcCols} FROM [dbo].[ErOnCallDoctor] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateOnCallAsync(ErOnCallDoctorUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[ErOnCallDoctor] (UnitCode, DeptCode, DeptName, DoctorName, Ext, EmpNo, SortOrder, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@UnitCode, @DeptCode, @DeptName, @DoctorName, @Ext, @EmpNo, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateOnCallAsync(int id, ErOnCallDoctorUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[ErOnCallDoctor] SET
                    UnitCode=@UnitCode, DeptCode=@DeptCode, DeptName=@DeptName, DoctorName=@DoctorName,
                    Ext=@Ext, EmpNo=@EmpNo, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE()
                    WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql,
            new { req.UnitCode, req.DeptCode, req.DeptName, req.DoctorName, req.Ext, req.EmpNo, req.SortOrder, req.IsActive, Id = id },
            cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteOnCallAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[ErOnCallDoctor] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── ER 三班醫護面板 [dbo].[ErShiftStaff] ───────────────────────
    private const string EssCols = "Id, UnitCode, ShiftKey, ShiftLabel, ShiftTime, Doctor, Aide, NurseStaffIds, SortOrder, IsActive, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<ErShiftStaffItem>> GetErShiftAsync(string unitCode, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = $@"SELECT {EssCols} FROM [dbo].[ErShiftStaff]
                     WHERE UnitCode=@UnitCode AND (@IncludeAll=1 OR IsActive=1)
                     ORDER BY SortOrder, Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<ErShiftStaffItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<ErShiftStaffItem?> GetErShiftByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<ErShiftStaffItem>(
            new CommandDefinition($"SELECT {EssCols} FROM [dbo].[ErShiftStaff] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateErShiftAsync(ErShiftStaffUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[ErShiftStaff] (UnitCode, ShiftKey, ShiftLabel, ShiftTime, Doctor, Aide, NurseStaffIds, SortOrder, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@UnitCode, @ShiftKey, @ShiftLabel, @ShiftTime, @Doctor, @Aide, @NurseStaffIds, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateErShiftAsync(int id, ErShiftStaffUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[ErShiftStaff] SET
                    UnitCode=@UnitCode, ShiftKey=@ShiftKey, ShiftLabel=@ShiftLabel, ShiftTime=@ShiftTime,
                    Doctor=@Doctor, Aide=@Aide, NurseStaffIds=@NurseStaffIds, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE()
                    WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.UnitCode, req.ShiftKey, req.ShiftLabel, req.ShiftTime, req.Doctor, req.Aide, req.NurseStaffIds, req.SortOrder, req.IsActive, Id = id
        }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteErShiftAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[ErShiftStaff] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── ER 床位主檔 [dbo].[ErBed] ──────────────────────────────────
    private const string BedCols = "Id, UnitCode, BedId, Ward, Zone, GridCol, GridRow, SortOrder, IsActive, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<ErBedItem>> GetErBedsAsync(string unitCode, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = $@"SELECT {BedCols} FROM [dbo].[ErBed]
                     WHERE UnitCode=@UnitCode AND (@IncludeAll=1 OR IsActive=1)
                     ORDER BY SortOrder, Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<ErBedItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<ErBedItem?> GetErBedByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<ErBedItem>(
            new CommandDefinition($"SELECT {BedCols} FROM [dbo].[ErBed] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateErBedAsync(ErBedUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[ErBed] (UnitCode, BedId, Ward, Zone, GridCol, GridRow, SortOrder, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@UnitCode, @BedId, @Ward, @Zone, @GridCol, @GridRow, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateErBedAsync(int id, ErBedUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[ErBed] SET
                    UnitCode=@UnitCode, BedId=@BedId, Ward=@Ward, Zone=@Zone, GridCol=@GridCol, GridRow=@GridRow,
                    SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE()
                    WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql,
            new { req.UnitCode, req.BedId, req.Ward, req.Zone, req.GridCol, req.GridRow, req.SortOrder, req.IsActive, Id = id },
            cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteErBedAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[ErBed] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── OR 刀房主檔 [dbo].[OrRoom] ─────────────────────────────────
    private const string OrRoomCols = "Id, UnitCode, RoomId, ApiRoom, SortOrder, IsActive, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<OrRoomItem>> GetOrRoomsAsync(string unitCode, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = $@"SELECT {OrRoomCols} FROM [dbo].[OrRoom]
                     WHERE UnitCode=@UnitCode AND (@IncludeAll=1 OR IsActive=1)
                     ORDER BY SortOrder, Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<OrRoomItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<OrRoomItem?> GetOrRoomByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<OrRoomItem>(
            new CommandDefinition($"SELECT {OrRoomCols} FROM [dbo].[OrRoom] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateOrRoomAsync(OrRoomUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[OrRoom] (UnitCode, RoomId, ApiRoom, SortOrder, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@UnitCode, @RoomId, @ApiRoom, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateOrRoomAsync(int id, OrRoomUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[OrRoom] SET
                    UnitCode=@UnitCode, RoomId=@RoomId, ApiRoom=@ApiRoom, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE()
                    WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql,
            new { req.UnitCode, req.RoomId, req.ApiRoom, req.SortOrder, req.IsActive, Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteOrRoomAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[OrRoom] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── OR 手術派班-班級人員 [dbo].[OrShiftStaff] ──────────────────
    private const string OssCols = "Id, UnitCode, ShiftType, Role, Name, RoleTitle, Ext, SortOrder, IsActive, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<OrShiftStaffItem>> GetShiftStaffAsync(string unitCode, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = $@"SELECT {OssCols} FROM [dbo].[OrShiftStaff]
                     WHERE UnitCode=@UnitCode AND (@IncludeAll=1 OR IsActive=1)
                     ORDER BY ShiftType, SortOrder, Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<OrShiftStaffItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<OrShiftStaffItem?> GetShiftStaffByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<OrShiftStaffItem>(
            new CommandDefinition($"SELECT {OssCols} FROM [dbo].[OrShiftStaff] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateShiftStaffAsync(OrShiftStaffUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[OrShiftStaff] (UnitCode, ShiftType, Role, Name, RoleTitle, Ext, SortOrder, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@UnitCode, @ShiftType, @Role, @Name, @RoleTitle, @Ext, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateShiftStaffAsync(int id, OrShiftStaffUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[OrShiftStaff] SET
                    UnitCode=@UnitCode, ShiftType=@ShiftType, Role=@Role, Name=@Name, RoleTitle=@RoleTitle,
                    Ext=@Ext, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE()
                    WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql,
            new { req.UnitCode, req.ShiftType, req.Role, req.Name, req.RoleTitle, req.Ext, req.SortOrder, req.IsActive, Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteShiftStaffAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[OrShiftStaff] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── OR 手術派班-房×班 刷手/流動 [dbo].[OrShiftRoom] ────────────
    private const string OsrCols = "Id, UnitCode, ShiftType, RoomId, ScrubNurse, CircNurse, Ext, SortOrder, IsActive, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<OrShiftRoomItem>> GetShiftRoomAsync(string unitCode, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = $@"SELECT {OsrCols} FROM [dbo].[OrShiftRoom]
                     WHERE UnitCode=@UnitCode AND (@IncludeAll=1 OR IsActive=1)
                     ORDER BY ShiftType, SortOrder, RoomId";
        using var conn = _db.Create();
        return await conn.QueryAsync<OrShiftRoomItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<OrShiftRoomItem?> GetShiftRoomByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<OrShiftRoomItem>(
            new CommandDefinition($"SELECT {OsrCols} FROM [dbo].[OrShiftRoom] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateShiftRoomAsync(OrShiftRoomUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[OrShiftRoom] (UnitCode, ShiftType, RoomId, ScrubNurse, CircNurse, Ext, SortOrder, IsActive, UpdatedAt, CreatedAt)
                    OUTPUT INSERTED.Id
                    VALUES (@UnitCode, @ShiftType, @RoomId, @ScrubNurse, @CircNurse, @Ext, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateShiftRoomAsync(int id, OrShiftRoomUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[OrShiftRoom] SET
                    UnitCode=@UnitCode, ShiftType=@ShiftType, RoomId=@RoomId, ScrubNurse=@ScrubNurse, CircNurse=@CircNurse,
                    Ext=@Ext, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE()
                    WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql,
            new { req.UnitCode, req.ShiftType, req.RoomId, req.ScrubNurse, req.CircNurse, req.Ext, req.SortOrder, req.IsActive, Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteShiftRoomAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[OrShiftRoom] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── OR 特殊交班 [dbo].[OrHandover] ─────────────────────────────
    private const string OhdCols = @"Id, UnitCode, Hhisnum, RoomId, PatientName, Gender, Age, SurgeryName, SurgerySource, SurgeonName,
        DestWard, DestBed, EndTime, BloodLoss, BloodTransfusion, DrainDetails, SpecialNotes, SortOrder, IsActive, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<OrHandoverItem>> GetHandoverAsync(string unitCode, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = $@"SELECT {OhdCols} FROM [dbo].[OrHandover]
                     WHERE UnitCode=@UnitCode AND (@IncludeAll=1 OR IsActive=1)
                     ORDER BY SortOrder, Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<OrHandoverItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<OrHandoverItem?> GetHandoverByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<OrHandoverItem>(
            new CommandDefinition($"SELECT {OhdCols} FROM [dbo].[OrHandover] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateHandoverAsync(OrHandoverUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[OrHandover]
            (UnitCode, Hhisnum, RoomId, PatientName, Gender, Age, SurgeryName, SurgerySource, SurgeonName,
             DestWard, DestBed, EndTime, BloodLoss, BloodTransfusion, DrainDetails, SpecialNotes, SortOrder, IsActive, UpdatedAt, CreatedAt)
            OUTPUT INSERTED.Id
            VALUES
            (@UnitCode, @Hhisnum, @RoomId, @PatientName, @Gender, @Age, @SurgeryName, @SurgerySource, @SurgeonName,
             @DestWard, @DestBed, @EndTime, @BloodLoss, @BloodTransfusion, @DrainDetails, @SpecialNotes, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateHandoverAsync(int id, OrHandoverUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[OrHandover] SET
            UnitCode=@UnitCode, Hhisnum=@Hhisnum, RoomId=@RoomId, PatientName=@PatientName, Gender=@Gender, Age=@Age,
            SurgeryName=@SurgeryName, SurgerySource=@SurgerySource, SurgeonName=@SurgeonName,
            DestWard=@DestWard, DestBed=@DestBed, EndTime=@EndTime, BloodLoss=@BloodLoss, BloodTransfusion=@BloodTransfusion,
            DrainDetails=@DrainDetails, SpecialNotes=@SpecialNotes, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE()
            WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.UnitCode, req.Hhisnum, req.RoomId, req.PatientName, req.Gender, req.Age, req.SurgeryName, req.SurgerySource,
            req.SurgeonName, req.DestWard, req.DestBed, req.EndTime, req.BloodLoss, req.BloodTransfusion, req.DrainDetails,
            req.SpecialNotes, req.SortOrder, req.IsActive, Id = id
        }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteHandoverAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[OrHandover] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── 各站頁首單位資訊 [dbo].[UnitInfo]（一站一列；以 UnitCode upsert）──
    private const string UiCols = "Id, UnitCode, HospitalName, WardName, DirectorLabel, DirectorName, HeadNurseLabel, HeadNurseName, TotalBeds, UpdatedAt, CreatedAt";

    public async Task<UnitInfoItem?> GetUnitInfoAsync(string unitCode, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<UnitInfoItem>(
            new CommandDefinition($"SELECT {UiCols} FROM [dbo].[UnitInfo] WHERE UnitCode=@UnitCode", new { UnitCode = unitCode }, cancellationToken: ct));
    }

    // ── 檢查/會診 [dbo].[WardExamConsult] ─────────────────────────
    private const string WecCols = @"Id, UnitCode, Kind, Hhisnum, BedId, PatientName, Gender, ItemName, Doctor,
        ScheduledDate, TimeSlot, CompletedTime, Status, Notes, SortOrder, IsActive, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<WardExamConsultItem>> GetExamConsultAsync(string unitCode, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = $@"SELECT {WecCols} FROM [dbo].[WardExamConsult]
                     WHERE UnitCode=@UnitCode AND (@IncludeAll=1 OR IsActive=1)
                     ORDER BY Kind DESC, SortOrder, Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<WardExamConsultItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<WardExamConsultItem?> GetExamConsultByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<WardExamConsultItem>(
            new CommandDefinition($"SELECT {WecCols} FROM [dbo].[WardExamConsult] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateExamConsultAsync(WardExamConsultUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[WardExamConsult]
            (UnitCode, Kind, Hhisnum, BedId, PatientName, Gender, ItemName, Doctor, ScheduledDate, TimeSlot, CompletedTime, Status, Notes, SortOrder, IsActive, UpdatedAt, CreatedAt)
            OUTPUT INSERTED.Id
            VALUES
            (@UnitCode, @Kind, @Hhisnum, @BedId, @PatientName, @Gender, @ItemName, @Doctor, @ScheduledDate, @TimeSlot, @CompletedTime, @Status, @Notes, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateExamConsultAsync(int id, WardExamConsultUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[WardExamConsult] SET
            UnitCode=@UnitCode, Kind=@Kind, Hhisnum=@Hhisnum, BedId=@BedId, PatientName=@PatientName, Gender=@Gender,
            ItemName=@ItemName, Doctor=@Doctor, ScheduledDate=@ScheduledDate, TimeSlot=@TimeSlot, CompletedTime=@CompletedTime,
            Status=@Status, Notes=@Notes, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE()
            WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.UnitCode, req.Kind, req.Hhisnum, req.BedId, req.PatientName, req.Gender, req.ItemName, req.Doctor,
            req.ScheduledDate, req.TimeSlot, req.CompletedTime, req.Status, req.Notes, req.SortOrder, req.IsActive, Id = id
        }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteExamConsultAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[WardExamConsult] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── ICU 抗生素 [dbo].[IcuAntibiotic] ─────────────────────────
    private const string AbxCols = @"Id, UnitCode, Hhisnum, DrugName, StartDateTime, FirstDoseDateTime,
        EndDateTime, SortOrder, IsActive, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<IcuAntibioticItem>> GetAntibioticAsync(string unitCode, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = $@"SELECT {AbxCols} FROM [dbo].[IcuAntibiotic]
                     WHERE UnitCode=@UnitCode AND (@IncludeAll=1 OR IsActive=1)
                     ORDER BY Hhisnum, SortOrder, Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<IcuAntibioticItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<IcuAntibioticItem?> GetAntibioticByIdAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<IcuAntibioticItem>(
            new CommandDefinition($"SELECT {AbxCols} FROM [dbo].[IcuAntibiotic] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateAntibioticAsync(IcuAntibioticUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[IcuAntibiotic]
            (UnitCode, Hhisnum, DrugName, StartDateTime, FirstDoseDateTime, EndDateTime, SortOrder, IsActive, UpdatedAt, CreatedAt)
            OUTPUT INSERTED.Id
            VALUES
            (@UnitCode, @Hhisnum, @DrugName, @StartDateTime, @FirstDoseDateTime, @EndDateTime, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateAntibioticAsync(int id, IcuAntibioticUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[IcuAntibiotic] SET
            UnitCode=@UnitCode, Hhisnum=@Hhisnum, DrugName=@DrugName, StartDateTime=@StartDateTime,
            FirstDoseDateTime=@FirstDoseDateTime, EndDateTime=@EndDateTime, SortOrder=@SortOrder,
            IsActive=@IsActive, UpdatedAt=GETDATE()
            WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.UnitCode, req.Hhisnum, req.DrugName, req.StartDateTime, req.FirstDoseDateTime,
            req.EndDateTime, req.SortOrder, req.IsActive, Id = id
        }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteAntibioticAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[IcuAntibiotic] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── 照護提醒 [dbo].[CareReminder] ─────────────────────────────
    private const string CrCols = @"cr.Id, cr.UnitCode, cr.BedId, cr.PatientName, cr.Gender, cr.Age, cr.Priority,
        cr.Category, cr.Content, cr.RemindTime, cr.PrimaryNurseStaffId, cr.IsDone, cr.SortOrder, cr.IsActive,
        cr.UpdatedAt, cr.CreatedAt, st.Name AS PrimaryNurseName";

    public async Task<IEnumerable<CareReminderItem>> GetCareReminderAsync(string unitCode, bool includeAll = false, CancellationToken ct = default)
    {
        var sql = $@"SELECT {CrCols} FROM [dbo].[CareReminder] cr
                     LEFT JOIN [dbo].[Staff] st ON st.Id = cr.PrimaryNurseStaffId
                     WHERE cr.UnitCode=@UnitCode AND (@IncludeAll=1 OR cr.IsActive=1)
                     ORDER BY cr.IsDone, cr.SortOrder, cr.Id";
        using var conn = _db.Create();
        return await conn.QueryAsync<CareReminderItem>(
            new CommandDefinition(sql, new { UnitCode = unitCode, IncludeAll = includeAll ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task<CareReminderItem?> GetCareReminderByIdAsync(int id, CancellationToken ct = default)
    {
        var sql = $@"SELECT {CrCols} FROM [dbo].[CareReminder] cr
                     LEFT JOIN [dbo].[Staff] st ON st.Id = cr.PrimaryNurseStaffId WHERE cr.Id=@Id";
        using var conn = _db.Create();
        return await conn.QueryFirstOrDefaultAsync<CareReminderItem>(new CommandDefinition(sql, new { Id = id }, cancellationToken: ct));
    }

    public async Task<int> CreateCareReminderAsync(CareReminderUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"INSERT INTO [dbo].[CareReminder]
            (UnitCode, BedId, PatientName, Gender, Age, Priority, Category, Content, RemindTime, PrimaryNurseStaffId, IsDone, SortOrder, IsActive, UpdatedAt, CreatedAt)
            OUTPUT INSERTED.Id
            VALUES
            (@UnitCode, @BedId, @PatientName, @Gender, @Age, @Priority, @Category, @Content, @RemindTime, @PrimaryNurseStaffId, @IsDone, @SortOrder, @IsActive, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        return await conn.ExecuteScalarAsync<int>(new CommandDefinition(sql, req, cancellationToken: ct));
    }

    public async Task<bool> UpdateCareReminderAsync(int id, CareReminderUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"UPDATE [dbo].[CareReminder] SET
            UnitCode=@UnitCode, BedId=@BedId, PatientName=@PatientName, Gender=@Gender, Age=@Age, Priority=@Priority,
            Category=@Category, Content=@Content, RemindTime=@RemindTime, PrimaryNurseStaffId=@PrimaryNurseStaffId,
            IsDone=@IsDone, SortOrder=@SortOrder, IsActive=@IsActive, UpdatedAt=GETDATE()
            WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.UnitCode, req.BedId, req.PatientName, req.Gender, req.Age, req.Priority, req.Category, req.Content,
            req.RemindTime, req.PrimaryNurseStaffId, req.IsDone, req.SortOrder, req.IsActive, Id = id
        }, cancellationToken: ct));
        return rows > 0;
    }

    public async Task<bool> DeleteCareReminderAsync(int id, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(
            new CommandDefinition("DELETE FROM [dbo].[CareReminder] WHERE Id=@Id", new { Id = id }, cancellationToken: ct));
        return rows > 0;
    }

    // ── OR 當日手術快照 [dbo].[OrDailySurgery] ─────────────────────
    private const string OdsCols = @"Id, SurgeryDate, Hhisnum, ApiRoom, RoomId, PatientName, Gender, BirthDate,
        SurgeryName, Doctor, Department, AnesType, Source, OpTime, Diagnosis, Completed, FirstSeenAt, LastSeenAt, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<OrDailySurgeryItem>> GetOrDailyAsync(DateTime fromDate, DateTime toDate, CancellationToken ct = default)
    {
        var sql = $@"SELECT {OdsCols} FROM [dbo].[OrDailySurgery]
                     WHERE SurgeryDate >= @From AND SurgeryDate <= @To
                     ORDER BY SurgeryDate, OpTime";
        using var conn = _db.Create();
        return await conn.QueryAsync<OrDailySurgeryItem>(
            new CommandDefinition(sql, new { From = fromDate.Date, To = toDate.Date }, cancellationToken: ct));
    }

    // ── OR 清洗手術清單 [dbo].[OrSurgery]（WhiteboardSync ETL 落地）─────
    private const string OrSurgeryCols = @"OpDate, OpTime, Room, RoomId, CaseType, CaseTypeText, ChartNo, CaseNo,
        PatientName, Sex, Age, SourceWard, SourceBed, SurgeonNo, SurgeonName, MentorName, AssistantNames,
        SurgeryName, Anesthesia, Department, NhiCodes, IcdCodes, StatusCode, CancelReason, EndDate, EndTime";

    public async Task<IEnumerable<OrSurgeryListRow>> GetOrSurgeryListAsync(DateTime fromDate, DateTime toDate, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        // 表由外部工具 WhiteboardSync 建立/餵入；尚未建立時回空清單，避免 500。
        var exists = await conn.ExecuteScalarAsync<int?>(
            new CommandDefinition("SELECT OBJECT_ID(N'dbo.OrSurgery', N'U')", cancellationToken: ct));
        if (exists is null) return Enumerable.Empty<OrSurgeryListRow>();

        var sql = $@"SELECT {OrSurgeryCols} FROM [dbo].[OrSurgery]
                     WHERE OpDate >= @From AND OpDate <= @To AND IsActive = 1
                     ORDER BY OpDate, OpTime, Room";
        return await conn.QueryAsync<OrSurgeryListRow>(
            new CommandDefinition(sql, new { From = fromDate.Date, To = toDate.Date }, cancellationToken: ct));
    }

    // ── 逐台刀 刷手/流動/備註 覆蓋 [dbo].[OrSurgeryNurse] ──
    private const string OsnCols = "Id, OpDate, RoomId, ChartNo, OpTime, ScrubNurse, CircNurse, AnesNurse, Note, UpdatedAt, CreatedAt";

    public async Task<IEnumerable<OrSurgeryNurseItem>> GetOrSurgeryNurseAsync(DateTime fromDate, DateTime toDate, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        var sql = $@"SELECT {OsnCols} FROM [dbo].[OrSurgeryNurse] WHERE OpDate >= @From AND OpDate <= @To";
        return await conn.QueryAsync<OrSurgeryNurseItem>(
            new CommandDefinition(sql, new { From = fromDate.Date, To = toDate.Date }, cancellationToken: ct));
    }

    /// <summary>批次依鍵(日期+房+病歷號+時間) upsert；三欄皆空→刪除。單一交易。回寫入/刪除筆數。</summary>
    public async Task<int> SaveOrSurgeryNurseBatchAsync(IEnumerable<OrSurgeryNurseUpsertRequest> entries, CancellationToken ct = default)
    {
        const string delSql = "DELETE FROM [dbo].[OrSurgeryNurse] WHERE OpDate=@OpDate AND RoomId=@RoomId AND ChartNo=@ChartNo AND OpTime=@OpTime";
        const string updSql = @"UPDATE [dbo].[OrSurgeryNurse] SET ScrubNurse=@ScrubNurse, CircNurse=@CircNurse, AnesNurse=@AnesNurse, Note=@Note, UpdatedAt=GETDATE()
                                WHERE OpDate=@OpDate AND RoomId=@RoomId AND ChartNo=@ChartNo AND OpTime=@OpTime";
        const string insSql = @"INSERT INTO [dbo].[OrSurgeryNurse] (OpDate, RoomId, ChartNo, OpTime, ScrubNurse, CircNurse, AnesNurse, Note, UpdatedAt, CreatedAt)
                                VALUES (@OpDate, @RoomId, @ChartNo, @OpTime, @ScrubNurse, @CircNurse, @AnesNurse, @Note, GETDATE(), GETDATE())";
        using var conn = _db.Create();
        conn.Open();
        using var tx = conn.BeginTransaction();
        int n = 0;
        try
        {
            foreach (var e in entries ?? Enumerable.Empty<OrSurgeryNurseUpsertRequest>())
            {
                var p = new
                {
                    OpDate = DateTime.Parse(e.OpDate).Date, RoomId = e.RoomId ?? "", ChartNo = e.ChartNo ?? "", OpTime = e.OpTime ?? "",
                    ScrubNurse = string.IsNullOrWhiteSpace(e.ScrubNurse) ? null : e.ScrubNurse!.Trim(),
                    CircNurse = string.IsNullOrWhiteSpace(e.CircNurse) ? null : e.CircNurse!.Trim(),
                    AnesNurse = string.IsNullOrWhiteSpace(e.AnesNurse) ? null : e.AnesNurse!.Trim(),
                    Note = string.IsNullOrWhiteSpace(e.Note) ? null : e.Note!.Trim()
                };
                if (p.ScrubNurse is null && p.CircNurse is null && p.AnesNurse is null && p.Note is null)
                {
                    n += await conn.ExecuteAsync(new CommandDefinition(delSql, p, tx, cancellationToken: ct));
                    continue;
                }
                var upd = await conn.ExecuteAsync(new CommandDefinition(updSql, p, tx, cancellationToken: ct));
                if (upd == 0) await conn.ExecuteAsync(new CommandDefinition(insSql, p, tx, cancellationToken: ct));
                n++;
            }
            tx.Commit();
        }
        catch { tx.Rollback(); throw; }
        return n;
    }

    /// <summary>依唯一鍵(日期+刀房+病歷號+時間) upsert；存在則更新欄位＋LastSeen、Completed 歸 0。</summary>
    public async Task<int> UpsertOrDailyAsync(OrDailySurgeryItem it, CancellationToken ct = default)
    {
        var sql = @"
            UPDATE [dbo].[OrDailySurgery] SET
                RoomId=@RoomId, PatientName=@PatientName, Gender=@Gender, BirthDate=@BirthDate,
                SurgeryName=@SurgeryName, Doctor=@Doctor, Department=@Department, AnesType=@AnesType, Source=@Source, Diagnosis=@Diagnosis,
                Completed=0, LastSeenAt=GETDATE(), UpdatedAt=GETDATE()
            WHERE SurgeryDate=@SurgeryDate AND ApiRoom=@ApiRoom AND Hhisnum=@Hhisnum AND OpTime=@OpTime;
            IF @@ROWCOUNT = 0
            INSERT INTO [dbo].[OrDailySurgery]
                (SurgeryDate, Hhisnum, ApiRoom, RoomId, PatientName, Gender, BirthDate, SurgeryName, Doctor, Department, AnesType, Source, OpTime, Diagnosis, Completed, FirstSeenAt, LastSeenAt, UpdatedAt, CreatedAt)
            VALUES
                (@SurgeryDate, @Hhisnum, @ApiRoom, @RoomId, @PatientName, @Gender, @BirthDate, @SurgeryName, @Doctor, @Department, @AnesType, @Source, @OpTime, @Diagnosis, 0, GETDATE(), GETDATE(), GETDATE(), GETDATE());";
        using var conn = _db.Create();
        return await conn.ExecuteAsync(new CommandDefinition(sql, new {
            it.SurgeryDate, it.Hhisnum, it.ApiRoom, it.RoomId, it.PatientName, it.Gender, it.BirthDate,
            it.SurgeryName, it.Doctor, it.Department, it.AnesType, it.Source, it.OpTime, it.Diagnosis
        }, cancellationToken: ct));
    }

    /// <summary>把某日「目前已不在院方清單」的快照列標記 Completed=1（傳入現存唯一鍵清單；空＝全部該日標完成）。</summary>
    public async Task<int> MarkOrDailyCompletedAsync(DateTime date, IEnumerable<string> presentKeys, CancellationToken ct = default)
    {
        // 唯一鍵以字串表示：ApiRoom|Hhisnum|OpTime
        var keys = presentKeys.ToList();
        var sql = @"UPDATE [dbo].[OrDailySurgery]
                    SET Completed=1, UpdatedAt=GETDATE()
                    WHERE SurgeryDate=@Date AND Completed=0
                      AND (ISNULL(ApiRoom,'') + '|' + Hhisnum + '|' + OpTime) NOT IN @Keys";
        using var conn = _db.Create();
        // Dapper 對空集合的 NOT IN 會出錯 → 空集合時用恆真比較
        if (keys.Count == 0)
            sql = @"UPDATE [dbo].[OrDailySurgery] SET Completed=1, UpdatedAt=GETDATE() WHERE SurgeryDate=@Date AND Completed=0";
        return await conn.ExecuteAsync(new CommandDefinition(sql, new { Date = date.Date, Keys = keys }, cancellationToken: ct));
    }

    public async Task<int> PurgeOrDailyAsync(DateTime beforeDate, CancellationToken ct = default)
    {
        using var conn = _db.Create();
        return await conn.ExecuteAsync(new CommandDefinition(
            "DELETE FROM [dbo].[OrDailySurgery] WHERE SurgeryDate < @Before", new { Before = beforeDate.Date }, cancellationToken: ct));
    }

    /// <summary>以 UnitCode 為鍵 upsert（存在則更新、否則新增）。</summary>
    public async Task<bool> UpsertUnitInfoAsync(UnitInfoUpsertRequest req, CancellationToken ct = default)
    {
        var sql = @"
            UPDATE [dbo].[UnitInfo] SET
                HospitalName=@HospitalName, WardName=@WardName,
                DirectorLabel=@DirectorLabel, DirectorName=@DirectorName,
                HeadNurseLabel=@HeadNurseLabel, HeadNurseName=@HeadNurseName, TotalBeds=@TotalBeds, UpdatedAt=GETDATE()
            WHERE UnitCode=@UnitCode;
            IF @@ROWCOUNT = 0
            INSERT INTO [dbo].[UnitInfo] (UnitCode, HospitalName, WardName, DirectorLabel, DirectorName, HeadNurseLabel, HeadNurseName, TotalBeds, UpdatedAt, CreatedAt)
            VALUES (@UnitCode, @HospitalName, @WardName, @DirectorLabel, @DirectorName, @HeadNurseLabel, @HeadNurseName, @TotalBeds, GETDATE(), GETDATE());";
        using var conn = _db.Create();
        await conn.ExecuteAsync(new CommandDefinition(sql, req, cancellationToken: ct));
        return true;
    }
}
