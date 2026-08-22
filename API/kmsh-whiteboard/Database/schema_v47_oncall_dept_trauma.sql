/* =============================================================================
   KMSH 外傷小組（獨立主檔，比照急診醫師 ErDoctor）＋值班醫師排程科別（v47）
   -----------------------------------------------------------------------------
   需求：外傷小組不放「系統管理 › 科別」，而是做成獨立主檔（後台 ER 管理 › 外傷小組），
        比照急診醫師；值班醫師排程的外傷小組讀取此獨立主檔（DoctorSource='TraumaDoctor'）。
   內容（皆冪等、可重跑；含清理本檔早期版本在 live DB 產生的科別/一般醫師，fresh DB 為 no-op）：
     (a) 建 TraumaDoctor 獨立主檔（clone ErDoctor）。
     (b) 插 2 位示意外傷醫師。
     (c) Upsert OnCallDept 外傷小組：OwnerUnit=ER、Slots='日班,夜班'、DoctorSource='TraumaDoctor'。
     (d) 清理舊做法：刪 Doctor(TR01/TR02)、刪 Department(TR)。
   以 sqlcmd 套用請加 -f 65001（UTF-8）；或用 SSMS。
   ============================================================================= */
SET NOCOUNT ON;
GO

-- (a) 外傷小組獨立主檔 TraumaDoctor（clone ErDoctor 結構）
IF OBJECT_ID(N'[dbo].[TraumaDoctor]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TraumaDoctor] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [Name]      NVARCHAR(50)  NOT NULL,             -- 姓名
        [DeptCode]  NVARCHAR(20)  NULL,                 -- 科別代碼（軟 FK → Department.Code）
        [Ext]       NVARCHAR(50)  NULL,                 -- 分機
        [Note]      NVARCHAR(200) NULL,                 -- 備註
        [SortOrder] INT           NOT NULL CONSTRAINT DF_TrDoc_Sort   DEFAULT(0),
        [IsActive]  BIT           NOT NULL CONSTRAINT DF_TrDoc_Active DEFAULT(1),
        [UpdatedAt] DATETIME2(0)  NOT NULL CONSTRAINT DF_TrDoc_Upd    DEFAULT(GETDATE()),
        [CreatedAt] DATETIME2(0)  NOT NULL CONSTRAINT DF_TrDoc_Crt    DEFAULT(GETDATE()),
        CONSTRAINT [PK_TraumaDoctor] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_TraumaDoctor_Sort ON [dbo].[TraumaDoctor] ([SortOrder], [Id]);
    PRINT N'[dbo].[TraumaDoctor] 已建立。';
END
GO

-- (b) 2 位示意外傷醫師（僅在整表為空時插入，避免重跑重複）
IF NOT EXISTS (SELECT 1 FROM [dbo].[TraumaDoctor])
BEGIN
    INSERT INTO [dbo].[TraumaDoctor] (Name, DeptCode, Ext, Note, SortOrder, IsActive, UpdatedAt, CreatedAt)
    VALUES (N'外傷醫師一', NULL, NULL, N'示意', 10, 1, GETDATE(), GETDATE()),
           (N'外傷醫師二', NULL, NULL, N'示意', 20, 1, GETDATE(), GETDATE());
    PRINT N'[dbo].[TraumaDoctor] 已插入 2 位示意醫師。';
END
GO

-- (c) OnCallDept 外傷小組：MERGE 不覆蓋既有 ＋ 冪等修正（DoctorSource='TraumaDoctor'）
MERGE [dbo].[OnCallDept] AS t
USING (VALUES (N'TR', N'外傷小組', N'日班,夜班', 6)) AS s (DeptCode, DeptName, Slots, SortOrder)
ON (t.DeptCode = s.DeptCode)
WHEN NOT MATCHED THEN
  INSERT (DeptCode, DeptName, Slots, OwnerUnit, DoctorSource, SortOrder, IsActive, UpdatedAt, CreatedAt)
  VALUES (s.DeptCode, s.DeptName, s.Slots, N'ER', N'TraumaDoctor', s.SortOrder, 1, GETDATE(), GETDATE());
GO
UPDATE [dbo].[OnCallDept]
   SET DeptName = N'外傷小組', OwnerUnit = N'ER', Slots = N'日班,夜班',
       DoctorSource = N'TraumaDoctor', IsActive = 1, UpdatedAt = GETDATE()
 WHERE DeptCode = N'TR';
GO

-- (d) 清理本檔早期版本產物（fresh DB 為 no-op）：先刪一般醫師再刪科別
DELETE FROM [dbo].[Doctor]     WHERE EmployeeNo IN (N'TR01', N'TR02');
DELETE FROM [dbo].[Department]  WHERE Code = N'TR';
GO

PRINT N'[v47] 外傷小組獨立主檔 TraumaDoctor 就緒；OnCallDept 外傷小組 DoctorSource=TraumaDoctor；已清理舊科別/一般醫師。';
GO
