/* =============================================================================
   KMSH ICU 抗生素 自建表 [dbo].[IcuAntibiotic]（v13）
   -----------------------------------------------------------------------------
   院方 UD.UDORDER 未開放 → 先自建。以「病歷號 Hhisnum」掛載（非床號），
   看板（抗生素分頁）以在床病人病歷號對應其用藥；後台可增刪改。
   種子掛在目前在床 AICU 真實病歷號（快照，2026-06 擷取；可後台調整）。
   可重複執行（OBJECT_ID＋IF NOT EXISTS）。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[IcuAntibiotic]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[IcuAntibiotic] (
        [Id]                INT IDENTITY(1,1) NOT NULL,
        [UnitCode]          NVARCHAR(20) NOT NULL CONSTRAINT DF_ABX_Unit DEFAULT(N'ICU'),
        [Hhisnum]           NVARCHAR(20)  NULL,            -- 病歷號（對應在床病人）
        [DrugName]          NVARCHAR(100) NULL,            -- 藥品名稱
        [StartDateTime]     NVARCHAR(30)  NULL,            -- 開始時間（yyyy-MM-dd HH:mm）
        [FirstDoseDateTime] NVARCHAR(30)  NULL,            -- 首次給藥時間
        [EndDateTime]       NVARCHAR(30)  NULL,            -- 結束時間
        [SortOrder]         INT NOT NULL CONSTRAINT DF_ABX_Sort     DEFAULT(0),
        [IsActive]          BIT NOT NULL CONSTRAINT DF_ABX_IsActive DEFAULT(1),
        [UpdatedAt]         DATETIME2(0) NOT NULL CONSTRAINT DF_ABX_Updated DEFAULT(GETDATE()),
        [CreatedAt]         DATETIME2(0) NOT NULL CONSTRAINT DF_ABX_Created DEFAULT(GETDATE()),
        CONSTRAINT [PK_IcuAntibiotic] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_IcuAntibiotic_Unit_His ON [dbo].[IcuAntibiotic] (UnitCode, Hhisnum);
END
GO

-- 註：不再植入示範種子。抗生素改由後台「ICU 抗生素」以當前在床病人清單逐一設定
-- （比照病人臨床補充 roster 模式）；避免固定病歷號的假資料出現在白板。

PRINT N'[dbo].[IcuAntibiotic] 已建立（無種子；資料由後台維護）。';
GO
