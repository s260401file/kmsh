-- schema_v44_er_doctor_group.sql
-- ER 急診醫師「每日緊急編組／點班」：每日 × 醫師的編組(逗號多組)＋點班。
-- 比照護理師模型（StaffSchedule.EmergencyGroup/IsCharge），但對象為 ErDoctor（非 Staff）。
SET NOCOUNT ON;
GO
IF OBJECT_ID(N'[dbo].[ErDoctorGroup]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ErDoctorGroup] (
        [Id]             INT IDENTITY(1,1) NOT NULL,
        [WorkDate]       DATE NOT NULL,
        [ErDoctorId]     INT NOT NULL,                 -- → ErDoctor.Id
        [EmergencyGroup] NVARCHAR(60) NULL,            -- 逗號分隔多組（通報班,滅火班…）
        [IsCharge]       BIT NOT NULL CONSTRAINT DF_ErDocGrp_Charge DEFAULT(0),  -- 點班
        [UpdatedAt]      DATETIME2(0) NOT NULL CONSTRAINT DF_ErDocGrp_Upd DEFAULT(GETDATE()),
        [CreatedAt]      DATETIME2(0) NOT NULL CONSTRAINT DF_ErDocGrp_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_ErDoctorGroup] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_ErDoctorGroup] UNIQUE ([WorkDate],[ErDoctorId])
    );
    CREATE INDEX IX_ErDoctorGroup_Date ON [dbo].[ErDoctorGroup] ([WorkDate]);
END
GO
