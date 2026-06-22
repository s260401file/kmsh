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
        Ventilator, Crrt, Ng, Surgery, Exam, Consult, Notes, IsActive, UpdatedAt, CreatedAt";

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
             Ventilator, Crrt, Ng, Surgery, Exam, Consult, Notes, IsActive, UpdatedAt, CreatedAt)
            OUTPUT INSERTED.Id
            VALUES
            (@UnitCode, @Hhisnum, @Department, @AttendingDoctor, @PrimaryNurse, @Diagnosis, @Condition, @BedStatus,
             @AdmissionDate, @Dnr, @Isolation, @FallRisk, @Dependency, @Confidential, @NoTreatment, @Npo, @Allergy,
             @Rrt, @Chemo, @Transport, @Oxygen, @Renal, @PortCath, @DLVC, @Foley, @CVC, @CardiacCath,
             @Ventilator, @Crrt, @Ng, @Surgery, @Exam, @Consult, @Notes, @IsActive, GETDATE(), GETDATE())";
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
            IsActive=@IsActive, UpdatedAt=GETDATE()
            WHERE Id=@Id";
        using var conn = _db.Create();
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new {
            req.UnitCode, req.Hhisnum, req.Department, req.AttendingDoctor, req.PrimaryNurse, req.Diagnosis,
            req.Condition, req.BedStatus, req.AdmissionDate, req.Dnr, req.Isolation, req.FallRisk, req.Dependency,
            req.Confidential, req.NoTreatment, req.Npo, req.Allergy, req.Rrt, req.Chemo, req.Transport, req.Oxygen,
            req.Renal, req.PortCath, req.DLVC, req.Foley, req.CVC, req.CardiacCath, req.Ventilator, req.Crrt, req.Ng,
            req.Surgery, req.Exam, req.Consult, req.Notes, req.IsActive, Id = id
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
}
