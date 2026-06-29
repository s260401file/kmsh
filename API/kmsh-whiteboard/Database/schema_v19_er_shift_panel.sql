/* =============================================================================
   KMSH ER「三班醫護人員」面板 自建表 [dbo].[ErShiftStaff]（v19）
   -----------------------------------------------------------------------------
   ER 病室動態右上面板：固定四班（大夜/白班/小夜/第四班12-20）。
   每班：醫師、照服員（自由文字）＋護理師（人員管理 Staff.Id，CSV）。
   班別/時間固定，後台只編人員。可重複執行（OBJECT_ID＋IF NOT EXISTS）。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[ErShiftStaff]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ErShiftStaff] (
        [Id]            INT IDENTITY(1,1) NOT NULL,
        [UnitCode]      NVARCHAR(20)  NOT NULL CONSTRAINT DF_ESS_Unit DEFAULT(N'ER'),
        [ShiftKey]      NVARCHAR(20)  NOT NULL,            -- night/day/evening/noon（固定）
        [ShiftLabel]    NVARCHAR(10)  NULL,                -- 大夜/白班/小夜（第四班為空）
        [ShiftTime]     NVARCHAR(20)  NULL,                -- 00:00–08:00 …
        [Doctor]        NVARCHAR(50)  NULL,                -- 醫師（自由輸入）
        [Aide]          NVARCHAR(50)  NULL,                -- 照服員（自由輸入）
        [NurseStaffIds] NVARCHAR(200) NULL,                -- 護理師 Staff.Id（逗號分隔）
        [SortOrder]     INT NOT NULL CONSTRAINT DF_ESS_Sort   DEFAULT(0),
        [IsActive]      BIT NOT NULL CONSTRAINT DF_ESS_Active DEFAULT(1),
        [UpdatedAt]     DATETIME2(0) NOT NULL CONSTRAINT DF_ESS_Upd DEFAULT(GETDATE()),
        [CreatedAt]     DATETIME2(0) NOT NULL CONSTRAINT DF_ESS_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_ErShiftStaff] PRIMARY KEY CLUSTERED ([Id])
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[ErShiftStaff])
BEGIN
    DECLARE @n1 INT = (SELECT Id FROM [dbo].[Staff] WHERE EmployeeNo=N'ERN1');  -- 尤○雯
    DECLARE @n2 INT = (SELECT Id FROM [dbo].[Staff] WHERE EmployeeNo=N'ERN2');  -- 卓○寧
    DECLARE @n3 INT = (SELECT Id FROM [dbo].[Staff] WHERE EmployeeNo=N'ERN3');  -- 温○蓉
    DECLARE @n4 INT = (SELECT Id FROM [dbo].[Staff] WHERE EmployeeNo=N'ERN4');  -- 柯○晴
    INSERT INTO [dbo].[ErShiftStaff] (UnitCode, ShiftKey, ShiftLabel, ShiftTime, Doctor, Aide, NurseStaffIds, SortOrder) VALUES
    (N'ER', N'night',   N'大夜', N'00:00–08:00', N'黃○誠醫師', N'何○妹照服員', CONVERT(NVARCHAR(20), @n4), 10),
    (N'ER', N'day',     N'白班', N'08:00–16:00', N'張○哲醫師', N'周○英照服員', CONCAT(@n2, N',', @n3), 20),
    (N'ER', N'evening', N'小夜', N'16:00–24:00', N'林○泰醫師', N'蔡○滿照服員', CONVERT(NVARCHAR(20), @n1), 30),
    (N'ER', N'noon',    N'',     N'12:00–20:00', NULL,        NULL,          CONCAT(@n3, N',', @n4), 40);
END
GO

PRINT N'[dbo].[ErShiftStaff] 建立並植入 ER 四班種子（護理師掛人員管理 ERN1–4）。';
GO
