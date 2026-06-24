/* =============================================================================
   KMSH 各站頁首單位資訊 [dbo].[UnitInfo]（v9，自建）
   -----------------------------------------------------------------------------
   各站白板頂部 2 個設定（主任／護理）改自建可後台編輯：一站一列。
   標籤各站不同（病房主任/手術室主任/急診主任；單位護理長/護理長）→ 標籤＋姓名各存。
   可重複執行（OBJECT_ID 建表保護；IF NOT EXISTS 種子）。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[UnitInfo]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[UnitInfo] (
        [Id]             INT IDENTITY(1,1) NOT NULL,
        [UnitCode]       NVARCHAR(20)  NOT NULL,            -- W52/ICU/OR/ER
        [HospitalName]   NVARCHAR(50)  NULL,
        [WardName]       NVARCHAR(50)  NULL,                -- 站別中文（W52病房/ICU/手術室/急診室）
        [DirectorLabel]  NVARCHAR(20)  NULL,                -- 主任職稱（病房主任/手術室主任/急診主任）
        [DirectorName]   NVARCHAR(50)  NULL,
        [HeadNurseLabel] NVARCHAR(20)  NULL,                -- 護理職稱（單位護理長/護理長）
        [HeadNurseName]  NVARCHAR(50)  NULL,
        [UpdatedAt]      DATETIME2(0) NOT NULL CONSTRAINT DF_UnitInfo_Updated DEFAULT(GETDATE()),
        [CreatedAt]      DATETIME2(0) NOT NULL CONSTRAINT DF_UnitInfo_Created DEFAULT(GETDATE()),
        CONSTRAINT [PK_UnitInfo] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_UnitInfo_Unit] UNIQUE ([UnitCode])
    );
END
GO

/* 種子：照搬各站現有頁首（mockData）。已存在則略過。 */
IF NOT EXISTS (SELECT 1 FROM [dbo].[UnitInfo])
BEGIN
    INSERT INTO [dbo].[UnitInfo] (UnitCode, HospitalName, WardName, DirectorLabel, DirectorName, HeadNurseLabel, HeadNurseName) VALUES
      ('W52', N'高雄市立民生醫院', N'W52病房', N'病房主任',   N'吳○明',     N'單位護理長', N'林○芳'),
      ('ICU', N'高雄市立民生醫院', N'ICU',     N'病房主任',   N'王○明',     N'單位護理長', N'陳○美'),
      ('OR',  N'高雄市立民生醫院', N'手術室',  N'手術室主任', N'林○泰醫師', N'護理長',     N'陳○雅護理長'),
      ('ER',  N'高雄市立民生醫院', N'急診室',  N'急診主任',   N'黃○誠',     N'護理長',     N'吳○珊');
END
GO

PRINT N'[dbo].[UnitInfo] 建立並植入 4 站頁首種子。';
GO
