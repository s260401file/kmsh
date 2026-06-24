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

IF NOT EXISTS (SELECT 1 FROM [dbo].[IcuAntibiotic])
BEGIN
    INSERT INTO [dbo].[IcuAntibiotic]
      (UnitCode, Hhisnum, DrugName, StartDateTime, FirstDoseDateTime, EndDateTime, SortOrder) VALUES
    -- 劉財華 (F4-03)
    (N'ICU', N'13592170', N'Vancomycin',              N'2026-06-20 08:00', N'2026-06-20 09:30', NULL, 10),
    (N'ICU', N'13592170', N'Meropenem',               N'2026-06-21 14:00', N'2026-06-21 15:00', NULL, 20),
    -- 趙建伸 (F4-11)
    (N'ICU', N'19028218', N'Piperacillin/Tazobactam', N'2026-06-22 06:00', N'2026-06-22 07:00', NULL, 10),
    -- 吳振興 (F4-01)
    (N'ICU', N'13276970', N'Meropenem',               N'2026-06-19 10:00', N'2026-06-19 11:00', N'2026-06-23 10:00', 10),
    -- 陳月理 (F4-13)
    (N'ICU', N'12222910', N'Ceftriaxone',             N'2026-06-23 08:00', N'2026-06-23 09:00', NULL, 10),
    -- 張哲雄 (F4-17)
    (N'ICU', N'16352030', N'Vancomycin',              N'2026-06-22 20:00', N'2026-06-22 21:30', NULL, 10);
END
GO

PRINT N'[dbo].[IcuAntibiotic] 建立並植入 ICU 抗生素種子（掛真實在床病歷號）。';
GO
