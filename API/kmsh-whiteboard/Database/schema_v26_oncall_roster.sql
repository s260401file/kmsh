/* =============================================================================
   KMSH 各科值班醫師「每日輪值排程」（v26）
   -----------------------------------------------------------------------------
   對照院方文件 Document/值班醫師：各科整月每日輪值（含 MED 一日多時段 值班/值日/
   上午/下午）、科別層級呼出/會診規則與備註。全院共用（不綁 UnitCode）。
   兩張表：OnCallDept（科別層級設定）＋ OnCallRoster（每日×科別×時段 值班醫師）。
   顯示端日後再接（現有 ErOnCallDoctor／ER 看板面板暫不動）。可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

/* 科別層級設定：時段組態、呼出/會診規則、備註、假日聯絡、預設分機/手機 */
IF OBJECT_ID(N'[dbo].[OnCallDept]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OnCallDept] (
        [Id]             INT IDENTITY(1,1) NOT NULL,
        [DeptCode]       NVARCHAR(20)  NOT NULL,   -- MED/GS/ORTH/NS/GYN/PS/PED/CRS/GU/CVS
        -- 注意：以 sqlcmd 套用請加 -f 65001（UTF-8）；或用 SSMS 開啟執行。
        [DeptName]       NVARCHAR(50)  NULL,
        [Slots]          NVARCHAR(200) NULL,       -- 每日時段標籤逗號分隔；空=單一(全日)。MED=值班,值日,上午,下午
        [CallOutRule]    NVARCHAR(400) NULL,       -- 呼出/會診時段規則
        [Remark]         NVARCHAR(400) NULL,       -- 備註（出國/月注記）
        [HolidayContact] NVARCHAR(200) NULL,       -- 假日緊急聯絡
        [Ext]            NVARCHAR(30)  NULL,        -- 預設分機
        [Mobile]         NVARCHAR(30)  NULL,        -- 預設手機/MVPN
        [SortOrder]      INT NOT NULL CONSTRAINT DF_OCD_Sort   DEFAULT(0),
        [IsActive]       BIT NOT NULL CONSTRAINT DF_OCD_Active DEFAULT(1),
        [UpdatedAt]      DATETIME2(0) NOT NULL CONSTRAINT DF_OCD_Upd DEFAULT(GETDATE()),
        [CreatedAt]      DATETIME2(0) NOT NULL CONSTRAINT DF_OCD_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_OnCallDept] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_OnCallDept_Dept] UNIQUE ([DeptCode])
    );
END
GO

/* 每日輪值：某日某科（某時段）的值班醫師。單一科別 Slot 可空(全日)；MED 一日多列 */
IF OBJECT_ID(N'[dbo].[OnCallRoster]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OnCallRoster] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [DeptCode]   NVARCHAR(20)  NOT NULL,
        [OnCallDate] DATE          NOT NULL,
        [Slot]       NVARCHAR(20)  NULL,           -- 對應 OnCallDept.Slots 之一；單一科別可空
        [DoctorName] NVARCHAR(50)  NULL,
        [Ext]        NVARCHAR(30)  NULL,
        [Mobile]     NVARCHAR(30)  NULL,
        [EmpNo]      NVARCHAR(20)  NULL,
        [Note]       NVARCHAR(200) NULL,           -- 單日備註（代班/出國…）
        [SortOrder]  INT NOT NULL CONSTRAINT DF_OCR_Sort   DEFAULT(0),
        [IsActive]   BIT NOT NULL CONSTRAINT DF_OCR_Active DEFAULT(1),
        [UpdatedAt]  DATETIME2(0) NOT NULL CONSTRAINT DF_OCR_Upd DEFAULT(GETDATE()),
        [CreatedAt]  DATETIME2(0) NOT NULL CONSTRAINT DF_OCR_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_OnCallRoster] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_OCR_DeptDate ON [dbo].[OnCallRoster] (DeptCode, OnCallDate);
    CREATE INDEX IX_OCR_Date     ON [dbo].[OnCallRoster] (OnCallDate);
END
GO

/* 種子：10 科（對照 schema_v4 ErOnCallDoctor）；MED 一日多時段。已存在則略過。 */
MERGE [dbo].[OnCallDept] AS t
USING (VALUES
  (N'MED', N'內科',         N'值班,值日,上午,下午', 10),
  (N'GS',  N'一般外科',     NULL, 20),
  (N'ORTH',N'骨科',         NULL, 30),
  (N'NS',  N'神經外科',     NULL, 40),
  (N'GYN', N'婦產科',       NULL, 50),
  (N'PS',  N'整形外科',     NULL, 60),
  (N'PED', N'小兒科',       NULL, 70),
  (N'CRS', N'大腸直腸外科', NULL, 80),
  (N'GU',  N'泌尿科',       NULL, 90),
  (N'CVS', N'心臟血管外科', NULL, 100)
) AS s (DeptCode,DeptName,Slots,SortOrder)
ON (t.DeptCode=s.DeptCode)
WHEN NOT MATCHED THEN
  INSERT (DeptCode,DeptName,Slots,SortOrder,IsActive,UpdatedAt,CreatedAt)
  VALUES (s.DeptCode,s.DeptName,s.Slots,s.SortOrder,1,GETDATE(),GETDATE());
GO

PRINT N'[dbo].[OnCallDept] / [dbo].[OnCallRoster] 建立完成，OnCallDept 植入 10 科種子。';
GO
