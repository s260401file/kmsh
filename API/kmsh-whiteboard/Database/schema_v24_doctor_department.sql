/* =============================================================================
   KMSH 全院共用「科別 Department」＋「醫師 Doctor」主檔（v24）
   -----------------------------------------------------------------------------
   第6次會議 Action #8：醫師名單＝全院共用單一總表（四站共維）＋全院共用科別清單。
   前提：先建科別、再建醫師（醫師的 DeptCode 對應 Department.Code，軟關聯）。
   刪除科別前若已被醫師使用則擋下（由後端 DeleteDepartment 檢查、回提示，非 DB FK）。
   日後 ICU/ER 會診醫師區、主治/主刀/值班等改由此總表挑選，取代各處自由打字。
   可重複執行（冪等）。
   ============================================================================= */
SET NOCOUNT ON;
GO

/* ── 1. 科別主檔 Department ──────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[Department]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Department] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [Code]      NVARCHAR(20)  NOT NULL,            -- 科別代碼（如 GS/MED/ORTH）
        [Name]      NVARCHAR(50)  NOT NULL,            -- 科別中文
        [SortOrder] INT NOT NULL CONSTRAINT DF_Dept_Sort   DEFAULT(0),
        [IsActive]  BIT NOT NULL CONSTRAINT DF_Dept_Active DEFAULT(1),
        [UpdatedAt] DATETIME2(0) NOT NULL CONSTRAINT DF_Dept_Upd DEFAULT(GETDATE()),
        [CreatedAt] DATETIME2(0) NOT NULL CONSTRAINT DF_Dept_Cre DEFAULT(GETDATE()),
        CONSTRAINT [PK_Department] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_Department_Code] UNIQUE ([Code])
    );
END
GO

/* ── 2. 醫師主檔 Doctor（DeptCode → Department.Code，軟關聯）──────── */
IF OBJECT_ID(N'[dbo].[Doctor]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Doctor] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [EmployeeNo] NVARCHAR(20)  NOT NULL,           -- 員編
        [Name]       NVARCHAR(50)  NOT NULL,           -- 姓名
        [DeptCode]   NVARCHAR(20)  NULL,               -- 科別代碼（對應 Department.Code）
        [Ext]        NVARCHAR(20)  NULL,               -- 分機
        [SortOrder]  INT NOT NULL CONSTRAINT DF_Doc_Sort   DEFAULT(0),
        [IsActive]   BIT NOT NULL CONSTRAINT DF_Doc_Active DEFAULT(1),
        [UpdatedAt]  DATETIME2(0) NOT NULL CONSTRAINT DF_Doc_Upd DEFAULT(GETDATE()),
        [CreatedAt]  DATETIME2(0) NOT NULL CONSTRAINT DF_Doc_Cre DEFAULT(GETDATE()),
        CONSTRAINT [PK_Doctor] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_Doctor_EmployeeNo] UNIQUE ([EmployeeNo])
    );
    CREATE INDEX [IX_Doctor_Dept] ON [dbo].[Doctor] ([DeptCode]);
END
GO

/* ── 3. 科別種子（約 22 科；已存在則略過，管理員可於後台自行增減）──── */
MERGE [dbo].[Department] AS t
USING (VALUES
  ('MED', N'內科',       10), ('GS',  N'一般外科',   20), ('ORTH',N'骨科',       30),
  ('NS',  N'神經外科',   40), ('NEU', N'神經內科',   50), ('OBS', N'婦產科',     60),
  ('PED', N'小兒科',     70), ('URO', N'泌尿科',     80), ('CV',  N'心臟內科',   90),
  ('GI',  N'腸胃內科',  100), ('CHE', N'胸腔內科',  110), ('NEP', N'腎臟科',    120),
  ('ID',  N'感染科',    130), ('REH', N'復健科',    140), ('PS',  N'整形外科',  150),
  ('OPH', N'眼科',      160), ('ENT', N'耳鼻喉科',  170), ('DER', N'皮膚科',    180),
  ('ANE', N'麻醉科',    190), ('EM',  N'急診醫學科',200), ('FM',  N'家醫科',    210),
  ('CRIT',N'重症醫學科',220)
) AS s (Code, Name, SortOrder)
ON (t.Code = s.Code)
WHEN NOT MATCHED THEN
  INSERT (Code, Name, SortOrder, IsActive, UpdatedAt, CreatedAt)
  VALUES (s.Code, s.Name, s.SortOrder, 1, GETDATE(), GETDATE());
GO

/* ── 4. 醫師種子：帶入本地 OrSurgery 既有真實醫師（員編＋姓名；科別留空待指派）──
   僅當 OrSurgery 存在；以員編去重、已存在略過。 */
IF OBJECT_ID(N'[dbo].[OrSurgery]', N'U') IS NOT NULL
BEGIN
    INSERT INTO [dbo].[Doctor] (EmployeeNo, Name, DeptCode, SortOrder, IsActive, UpdatedAt, CreatedAt)
    SELECT src.SurgeonNo, MAX(src.SurgeonName), NULL, 0, 1, GETDATE(), GETDATE()
    FROM [dbo].[OrSurgery] src
    WHERE LTRIM(RTRIM(ISNULL(src.SurgeonNo,''))) <> ''
      AND LTRIM(RTRIM(ISNULL(src.SurgeonName,''))) <> ''
      AND NOT EXISTS (SELECT 1 FROM [dbo].[Doctor] d WHERE d.EmployeeNo = src.SurgeonNo)
    GROUP BY src.SurgeonNo;
END
GO

PRINT N'[dbo].[Department] / [dbo].[Doctor] 主檔建立並植入種子完成。';
GO
