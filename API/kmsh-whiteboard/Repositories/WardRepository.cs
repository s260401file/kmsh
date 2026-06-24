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
        Observation, Awaiting, AwaitingType, TransferIn, TransferOut, TransferHospital, Admitted, AdmBedNo,
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
             Observation, Awaiting, AwaitingType, TransferIn, TransferOut, TransferHospital, Admitted, AdmBedNo,
             Aad, Mbd, Deceased, ArrivalDate, ArrivalTime,
             ScrubNurse, CircNurse, SurgeryStatus, StartTime, EndTime,
             IsActive, UpdatedAt, CreatedAt)
            OUTPUT INSERTED.Id
            VALUES
            (@UnitCode, @Hhisnum, @Department, @AttendingDoctor, @PrimaryNurse, @Diagnosis, @Condition, @BedStatus,
             @AdmissionDate, @Dnr, @Isolation, @FallRisk, @Dependency, @Confidential, @NoTreatment, @Npo, @Allergy,
             @Rrt, @Chemo, @Transport, @Oxygen, @Renal, @PortCath, @DLVC, @Foley, @CVC, @CardiacCath,
             @Ventilator, @Crrt, @Ng, @Surgery, @Exam, @Consult, @Notes,
             @Observation, @Awaiting, @AwaitingType, @TransferIn, @TransferOut, @TransferHospital, @Admitted, @AdmBedNo,
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
            TransferOut=@TransferOut, TransferHospital=@TransferHospital, Admitted=@Admitted, AdmBedNo=@AdmBedNo,
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
            req.Observation, req.Awaiting, req.AwaitingType, req.TransferIn, req.TransferOut, req.TransferHospital,
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
}
