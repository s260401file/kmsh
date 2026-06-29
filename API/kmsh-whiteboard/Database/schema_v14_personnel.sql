/* =============================================================================
   KMSH 人員管理（v14）：人員主檔＋多單位多角色＋排班＋床位指派＋查房＋結構化交班
   -----------------------------------------------------------------------------
   一人可跨多單位/多角色（Staff ↔ StaffUnitRole 多對多）。
   權限＝比照現狀（管理員 IsAdmin / 各區管理者 StaffUnitRole.IsManager）。
   登入現階段「員編免密碼」（PasswordHash 預留，待真驗證）。
   支撐 W52 排班資訊/醫師資訊/護理交班/照護團隊 等頁籤（皆從本組表組裝）。
   軟關聯（不設 FK，比照既有自建表風格）；日期類種子用今天，方便示範。
   可重複執行（OBJECT_ID＋IF NOT EXISTS）。
   ============================================================================= */
SET NOCOUNT ON;
GO

/* ── 1. 人員主檔 ───────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[Staff]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Staff] (
        [Id]           INT IDENTITY(1,1) NOT NULL,
        [EmployeeNo]   NVARCHAR(20)  NOT NULL,            -- 員編（登入帳號，唯一）
        [Name]         NVARCHAR(50)  NOT NULL,
        [Ext]          NVARCHAR(20)  NULL,                -- 分機
        [Mobile]       NVARCHAR(30)  NULL,                -- 手機
        [IsAdmin]      BIT NOT NULL CONSTRAINT DF_Staff_Admin   DEFAULT(0),  -- 系統管理員（全站）
        [PasswordHash] NVARCHAR(200) NULL,                -- 預留，待真驗證
        [IsActive]     BIT NOT NULL CONSTRAINT DF_Staff_Active  DEFAULT(1),
        [SortOrder]    INT NOT NULL CONSTRAINT DF_Staff_Sort    DEFAULT(0),
        [UpdatedAt]    DATETIME2(0) NOT NULL CONSTRAINT DF_Staff_Upd DEFAULT(GETDATE()),
        [CreatedAt]    DATETIME2(0) NOT NULL CONSTRAINT DF_Staff_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_Staff] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE UNIQUE INDEX UX_Staff_EmployeeNo ON [dbo].[Staff] (EmployeeNo);
END
GO

/* ── 2. 人員×單位×角色 ───────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[StaffUnitRole]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[StaffUnitRole] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [StaffId]    INT NOT NULL,
        [UnitCode]   NVARCHAR(20) NOT NULL,               -- W52/ICU/OR/ER
        [Role]       NVARCHAR(30) NOT NULL,               -- 職別：護理長/護理師/主治醫師/住院醫師/專科護理師/照服員/醫事…
        [Department] NVARCHAR(50) NULL,                   -- 科別 或 專長
        [IsManager]  BIT NOT NULL CONSTRAINT DF_SUR_Mgr    DEFAULT(0),  -- 該區管理者（權限）
        [GroupKey]   NVARCHAR(20) NULL,                   -- 照護團隊分組：leader/attending/resident/specialist/nurse/allied
        [SortOrder]  INT NOT NULL CONSTRAINT DF_SUR_Sort   DEFAULT(0),
        [IsActive]   BIT NOT NULL CONSTRAINT DF_SUR_Active  DEFAULT(1),
        [UpdatedAt]  DATETIME2(0) NOT NULL CONSTRAINT DF_SUR_Upd DEFAULT(GETDATE()),
        [CreatedAt]  DATETIME2(0) NOT NULL CONSTRAINT DF_SUR_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_StaffUnitRole] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_SUR_Staff ON [dbo].[StaffUnitRole] (StaffId);
    CREATE INDEX IX_SUR_Unit  ON [dbo].[StaffUnitRole] (UnitCode, Role);
END
GO

/* ── 3. 排班（白/小夜/大夜） ──────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[StaffSchedule]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[StaffSchedule] (
        [Id]             INT IDENTITY(1,1) NOT NULL,
        [StaffId]        INT NOT NULL,
        [UnitCode]       NVARCHAR(20) NOT NULL,
        [WorkDate]       DATE NOT NULL,
        [Shift]          NVARCHAR(10) NOT NULL,           -- 白班/小夜/大夜/休
        [EmergencyGroup] NVARCHAR(20) NULL,               -- 緊急編組（指揮/A/B…）
        [IsCharge]       BIT NOT NULL CONSTRAINT DF_Sch_Charge DEFAULT(0),  -- 點班
        [Note]           NVARCHAR(100) NULL,
        [SortOrder]      INT NOT NULL CONSTRAINT DF_Sch_Sort   DEFAULT(0),
        [IsActive]       BIT NOT NULL CONSTRAINT DF_Sch_Active DEFAULT(1),
        [UpdatedAt]      DATETIME2(0) NOT NULL CONSTRAINT DF_Sch_Upd DEFAULT(GETDATE()),
        [CreatedAt]      DATETIME2(0) NOT NULL CONSTRAINT DF_Sch_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_StaffSchedule] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_Sch_UnitDate ON [dbo].[StaffSchedule] (UnitCode, WorkDate, Shift);
    CREATE INDEX IX_Sch_Staff    ON [dbo].[StaffSchedule] (StaffId);
END
GO

/* ── 4. 床位指派（主護勾床／醫師-床 共用） ──────────────────────── */
IF OBJECT_ID(N'[dbo].[BedStaffAssignment]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BedStaffAssignment] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [UnitCode]   NVARCHAR(20) NOT NULL,
        [BedId]      NVARCHAR(20) NOT NULL,               -- 床號（如 001 或 W52-001）
        [WorkDate]   DATE NOT NULL,
        [Shift]      NVARCHAR(10) NULL,                   -- 白/小夜/大夜（醫師-床可空）
        [StaffId]    INT NOT NULL,
        [AssignType] NVARCHAR(10) NOT NULL CONSTRAINT DF_BSA_Type DEFAULT(N'主護'),  -- 主護/主治/專師
        [SortOrder]  INT NOT NULL CONSTRAINT DF_BSA_Sort   DEFAULT(0),
        [IsActive]   BIT NOT NULL CONSTRAINT DF_BSA_Active DEFAULT(1),
        [UpdatedAt]  DATETIME2(0) NOT NULL CONSTRAINT DF_BSA_Upd DEFAULT(GETDATE()),
        [CreatedAt]  DATETIME2(0) NOT NULL CONSTRAINT DF_BSA_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_BedStaffAssignment] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_BSA_UnitDate ON [dbo].[BedStaffAssignment] (UnitCode, WorkDate, AssignType);
    CREATE INDEX IX_BSA_Staff    ON [dbo].[BedStaffAssignment] (StaffId);
END
GO

/* ── 5. 查房時間表 ───────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[DoctorRound]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DoctorRound] (
        [Id]            INT IDENTITY(1,1) NOT NULL,
        [UnitCode]      NVARCHAR(20) NOT NULL,
        [RoundDate]     DATE NOT NULL,
        [StaffId]       INT NULL,                         -- 對應人員（可空，亦可手填姓名）
        [DoctorName]    NVARCHAR(50) NULL,                -- 顯示用（StaffId 空時）
        [Specialty]     NVARCHAR(50) NULL,
        [EstimatedTime] NVARCHAR(10) NULL,                -- 預定 09:00
        [ActualTime]    NVARCHAR(10) NULL,                -- 實際 09:08
        [IsCompleted]   BIT NOT NULL CONSTRAINT DF_DR_Done DEFAULT(0),
        [Remark]        NVARCHAR(100) NULL,
        [SortOrder]     INT NOT NULL CONSTRAINT DF_DR_Sort   DEFAULT(0),
        [IsActive]      BIT NOT NULL CONSTRAINT DF_DR_Active DEFAULT(1),
        [UpdatedAt]     DATETIME2(0) NOT NULL CONSTRAINT DF_DR_Upd DEFAULT(GETDATE()),
        [CreatedAt]     DATETIME2(0) NOT NULL CONSTRAINT DF_DR_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_DoctorRound] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_DR_UnitDate ON [dbo].[DoctorRound] (UnitCode, RoundDate);
END
GO

/* ── 6. 護理交班 header ──────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[HandoverShift]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[HandoverShift] (
        [Id]            INT IDENTITY(1,1) NOT NULL,
        [UnitCode]      NVARCHAR(20) NOT NULL,
        [WorkDate]      DATE NOT NULL,
        [FromShift]     NVARCHAR(10) NULL,
        [FromShiftTime] NVARCHAR(20) NULL,
        [ToShift]       NVARCHAR(10) NULL,
        [ToShiftTime]   NVARCHAR(20) NULL,
        [HandoverTime]  NVARCHAR(10) NULL,
        [FromStaffIds]  NVARCHAR(200) NULL,               -- 交班護理師 StaffId（逗號分隔）
        [ToStaffIds]    NVARCHAR(200) NULL,               -- 接班護理師 StaffId
        [IsActive]      BIT NOT NULL CONSTRAINT DF_HS_Active DEFAULT(1),
        [UpdatedAt]     DATETIME2(0) NOT NULL CONSTRAINT DF_HS_Upd DEFAULT(GETDATE()),
        [CreatedAt]     DATETIME2(0) NOT NULL CONSTRAINT DF_HS_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_HandoverShift] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_HS_UnitDate ON [dbo].[HandoverShift] (UnitCode, WorkDate, FromShift);
END
GO

/* ── 7. 護理交班-病人卡 ──────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[HandoverPatient]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[HandoverPatient] (
        [Id]              INT IDENTITY(1,1) NOT NULL,
        [HandoverShiftId] INT NOT NULL,
        [BedNo]           NVARCHAR(20) NULL,
        [Hhisnum]         NVARCHAR(20) NULL,
        [PatientName]     NVARCHAR(50) NULL,
        [Gender]          NVARCHAR(2)  NULL,
        [Age]             INT NULL,
        [Diagnosis]       NVARCHAR(200) NULL,
        [Priority]        NVARCHAR(10) NULL,              -- 高/中/低
        [SortOrder]       INT NOT NULL CONSTRAINT DF_HP_Sort DEFAULT(0),
        [UpdatedAt]       DATETIME2(0) NOT NULL CONSTRAINT DF_HP_Upd DEFAULT(GETDATE()),
        [CreatedAt]       DATETIME2(0) NOT NULL CONSTRAINT DF_HP_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_HandoverPatient] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_HP_Shift ON [dbo].[HandoverPatient] (HandoverShiftId);
END
GO

/* ── 8. 護理交班-事項 ────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[HandoverItem]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[HandoverItem] (
        [Id]                INT IDENTITY(1,1) NOT NULL,
        [HandoverPatientId] INT NOT NULL,
        [Category]          NVARCHAR(20) NULL,            -- 管路/用藥/生命徵象/警示/家屬/待辦
        [Content]           NVARCHAR(300) NULL,
        [SortOrder]         INT NOT NULL CONSTRAINT DF_HI_Sort DEFAULT(0),
        [UpdatedAt]         DATETIME2(0) NOT NULL CONSTRAINT DF_HI_Upd DEFAULT(GETDATE()),
        [CreatedAt]         DATETIME2(0) NOT NULL CONSTRAINT DF_HI_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_HandoverItem] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_HI_Patient ON [dbo].[HandoverItem] (HandoverPatientId);
END
GO

/* ════════════════════ 種子（W52 示範；日期＝今天） ════════════════════ */
DECLARE @today DATE = CONVERT(date, GETDATE());

/* 人員主檔 */
IF NOT EXISTS (SELECT 1 FROM [dbo].[Staff])
BEGIN
    INSERT INTO [dbo].[Staff] (EmployeeNo, Name, Ext, Mobile, IsAdmin, SortOrder) VALUES
    (N'ADMIN', N'系統管理員', NULL,   NULL,           1, 0),
    (N'N001',  N'林○芳',     N'5210', N'0912-100-002', 0, 10),
    (N'N002',  N'陳○梅',     N'5201', N'0922-100-101', 0, 20),
    (N'N003',  N'蔡○柔',     N'5202', N'0922-100-102', 0, 30),
    (N'N004',  N'鄭○雲',     N'5203', N'0922-100-103', 0, 40),
    (N'N005',  N'林○靜',     N'5204', N'0922-100-104', 0, 50),
    (N'S001',  N'李○玲',     N'5220', N'0933-100-201', 0, 60),
    (N'D001',  N'張○明',     N'5301', N'0911-111-111', 0, 70),
    (N'D002',  N'王○強',     N'5302', N'0911-111-222', 0, 80),
    (N'R001',  N'吳○昇',     N'5300', N'0911-111-333', 0, 90);
END
GO

/* 單位×角色（W52） */
IF NOT EXISTS (SELECT 1 FROM [dbo].[StaffUnitRole])
BEGIN
    INSERT INTO [dbo].[StaffUnitRole] (StaffId, UnitCode, Role, Department, IsManager, GroupKey, SortOrder)
    SELECT s.Id, v.UnitCode, v.Role, v.Department, v.IsManager, v.GroupKey, v.SortOrder
    FROM (VALUES
        (N'N001', N'W52', N'護理長',     N'W52 護理科', 1, N'leader',     10),
        (N'N002', N'W52', N'護理師',     NULL,          0, N'nurse',      20),
        (N'N003', N'W52', N'護理師',     NULL,          0, N'nurse',      30),
        (N'N004', N'W52', N'護理師',     NULL,          0, N'nurse',      40),
        (N'N005', N'W52', N'護理師',     NULL,          0, N'nurse',      50),
        (N'S001', N'W52', N'專科護理師', N'傷口照護',   0, N'specialist', 60),
        (N'D001', N'W52', N'主治醫師',   N'一般外科',   0, N'attending',  70),
        (N'D002', N'W52', N'主治醫師',   N'一般外科',   0, N'attending',  80),
        (N'R001', N'W52', N'住院醫師',   N'一般外科',   0, N'resident',   90)
    ) v(EmpNo, UnitCode, Role, Department, IsManager, GroupKey, SortOrder)
    JOIN [dbo].[Staff] s ON s.EmployeeNo = v.EmpNo;
END
GO

/* 排班（今天） */
IF NOT EXISTS (SELECT 1 FROM [dbo].[StaffSchedule])
BEGIN
    DECLARE @d DATE = CONVERT(date, GETDATE());
    INSERT INTO [dbo].[StaffSchedule] (StaffId, UnitCode, WorkDate, Shift, EmergencyGroup, IsCharge, SortOrder)
    SELECT s.Id, N'W52', @d, v.Shift, v.EG, v.Charge, v.SortOrder
    FROM (VALUES
        (N'N001', N'白班', N'指揮', 1, 10),
        (N'N002', N'白班', N'A',    0, 20),
        (N'N003', N'白班', N'B',    0, 30),
        (N'S001', N'白班', NULL,    0, 40),
        (N'D001', N'白班', NULL,    0, 50),
        (N'R001', N'白班', NULL,    0, 60),
        (N'N004', N'小夜', NULL,    1, 70),
        (N'N005', N'小夜', NULL,    0, 80)
    ) v(EmpNo, Shift, EG, Charge, SortOrder)
    JOIN [dbo].[Staff] s ON s.EmployeeNo = v.EmpNo;
END
GO

/* 床位指派（今天） */
IF NOT EXISTS (SELECT 1 FROM [dbo].[BedStaffAssignment])
BEGIN
    DECLARE @d2 DATE = CONVERT(date, GETDATE());
    INSERT INTO [dbo].[BedStaffAssignment] (UnitCode, BedId, WorkDate, Shift, StaffId, AssignType, SortOrder)
    SELECT N'W52', v.BedId, @d2, v.Shift, s.Id, v.AssignType, v.SortOrder
    FROM (VALUES
        (N'001', N'白班', N'N002', N'主護', 10),(N'002', N'白班', N'N002', N'主護', 11),
        (N'003', N'白班', N'N002', N'主護', 12),(N'004', N'白班', N'N002', N'主護', 13),
        (N'005', N'白班', N'N003', N'主護', 20),(N'006', N'白班', N'N003', N'主護', 21),
        (N'007', N'白班', N'N003', N'主護', 22),(N'008', N'白班', N'N003', N'主護', 23),
        (N'001', NULL,   N'D001', N'主治', 30),(N'002', NULL,   N'D001', N'主治', 31),
        (N'003', NULL,   N'D001', N'主治', 32),(N'004', NULL,   N'D001', N'主治', 33),
        (N'005', NULL,   N'D001', N'主治', 34),(N'006', NULL,   N'D001', N'主治', 35),
        (N'007', NULL,   N'D002', N'主治', 40),(N'008', NULL,   N'D002', N'主治', 41),
        (N'009', NULL,   N'D002', N'主治', 42),(N'010', NULL,   N'D002', N'主治', 43)
    ) v(BedId, Shift, EmpNo, AssignType, SortOrder)
    JOIN [dbo].[Staff] s ON s.EmployeeNo = v.EmpNo;
END
GO

/* 查房表（今天） */
IF NOT EXISTS (SELECT 1 FROM [dbo].[DoctorRound])
BEGIN
    DECLARE @d3 DATE = CONVERT(date, GETDATE());
    INSERT INTO [dbo].[DoctorRound] (UnitCode, RoundDate, StaffId, DoctorName, Specialty, EstimatedTime, ActualTime, IsCompleted, Remark, SortOrder)
    SELECT N'W52', @d3, s.Id, v.DoctorName, v.Specialty, v.Est, v.Act, v.Done, v.Remark, v.SortOrder
    FROM (VALUES
        (N'D001', N'張○明 醫師', N'一般外科', N'09:00', N'09:08', 1, N'', 10),
        (N'D002', N'王○強 醫師', N'一般外科', N'14:00', NULL,    0, N'', 20)
    ) v(EmpNo, DoctorName, Specialty, Est, Act, Done, Remark, SortOrder)
    JOIN [dbo].[Staff] s ON s.EmployeeNo = v.EmpNo;
END
GO

/* 護理交班（今天：白班→小夜） */
IF NOT EXISTS (SELECT 1 FROM [dbo].[HandoverShift])
BEGIN
    DECLARE @d4 DATE = CONVERT(date, GETDATE());
    DECLARE @n2 INT = (SELECT Id FROM [dbo].[Staff] WHERE EmployeeNo=N'N002');
    DECLARE @n3 INT = (SELECT Id FROM [dbo].[Staff] WHERE EmployeeNo=N'N003');
    DECLARE @n4 INT = (SELECT Id FROM [dbo].[Staff] WHERE EmployeeNo=N'N004');
    DECLARE @n5 INT = (SELECT Id FROM [dbo].[Staff] WHERE EmployeeNo=N'N005');
    INSERT INTO [dbo].[HandoverShift] (UnitCode, WorkDate, FromShift, FromShiftTime, ToShift, ToShiftTime, HandoverTime, FromStaffIds, ToStaffIds)
    VALUES (N'W52', @d4, N'白班', N'08:00–16:00', N'小夜', N'16:00–24:00', N'16:00',
            CONCAT(@n2, N',', @n3), CONCAT(@n4, N',', @n5));

    DECLARE @hsid INT = SCOPE_IDENTITY();
    INSERT INTO [dbo].[HandoverPatient] (HandoverShiftId, BedNo, PatientName, Gender, Age, Diagnosis, Priority, SortOrder) VALUES
    (@hsid, N'001', N'林○志', N'M', 75, N'股骨頸骨折 — THA 術後 D2', N'高', 10),
    (@hsid, N'006', N'王○豪', N'M', 58, N'MRSA 傷口感染 — 接觸隔離中',  N'高', 20);

    DECLARE @p1 INT = (SELECT Id FROM [dbo].[HandoverPatient] WHERE HandoverShiftId=@hsid AND BedNo=N'001');
    DECLARE @p2 INT = (SELECT Id FROM [dbo].[HandoverPatient] WHERE HandoverShiftId=@hsid AND BedNo=N'006');
    INSERT INTO [dbo].[HandoverItem] (HandoverPatientId, Category, Content, SortOrder) VALUES
    (@p1, N'管路', N'尿管 D2、CVP D3，注意引流量與顏色', 10),
    (@p1, N'用藥', N'Morphine 5mg PRN q4h，疼痛評估後給藥', 20),
    (@p1, N'警示', N'跌倒高風險、夜間譫妄，加強巡視',     30),
    (@p2, N'感控', N'MRSA 接觸隔離：穿戴手套隔離衣，訪客登記', 10),
    (@p2, N'待辦', N'明日 08:00 傷口培養追蹤回報',           20);
END
GO

PRINT N'[人員管理 v14] Staff/StaffUnitRole/StaffSchedule/BedStaffAssignment/DoctorRound/Handover* 建立並植入 W52 種子。';
GO
