/* =============================================================================
   KMSH 照護提醒 自建表 [dbo].[CareReminder]（v16，W52）
   -----------------------------------------------------------------------------
   院方無此操作性資料 → 自建。床號/病人手填；責任護理師掛人員（Staff）。
   後台可增刪改；前台 CareTab 即時顯示。可重複執行（OBJECT_ID＋IF NOT EXISTS）。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[CareReminder]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[CareReminder] (
        [Id]                  INT IDENTITY(1,1) NOT NULL,
        [UnitCode]            NVARCHAR(20)  NOT NULL CONSTRAINT DF_CR_Unit DEFAULT(N'W52'),
        [BedId]               NVARCHAR(20)  NULL,            -- 床號（手填，如 014）
        [PatientName]         NVARCHAR(50)  NULL,
        [Gender]              NVARCHAR(2)   NULL,            -- M/F
        [Age]                 INT           NULL,
        [Priority]            NVARCHAR(4)   NULL,            -- 高/中/低
        [Category]            NVARCHAR(20)  NULL,            -- 術後照護/感控/管路/跌倒防護/藥物/檢查追蹤/衛教/出院準備
        [Content]             NVARCHAR(300) NULL,
        [RemindTime]          NVARCHAR(10)  NULL,            -- 提醒時間 HH:mm
        [PrimaryNurseStaffId] INT           NULL,            -- 責任護理師（軟關聯 Staff.Id）
        [IsDone]              BIT NOT NULL CONSTRAINT DF_CR_Done   DEFAULT(0),
        [SortOrder]           INT NOT NULL CONSTRAINT DF_CR_Sort   DEFAULT(0),
        [IsActive]            BIT NOT NULL CONSTRAINT DF_CR_Active  DEFAULT(1),
        [UpdatedAt]           DATETIME2(0) NOT NULL CONSTRAINT DF_CR_Upd DEFAULT(GETDATE()),
        [CreatedAt]           DATETIME2(0) NOT NULL CONSTRAINT DF_CR_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_CareReminder] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_CareReminder_Unit ON [dbo].[CareReminder] (UnitCode, IsActive);
END
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[CareReminder])
BEGIN
    DECLARE @n2 INT = (SELECT Id FROM [dbo].[Staff] WHERE EmployeeNo = N'N002');  -- 陳○梅
    DECLARE @n3 INT = (SELECT Id FROM [dbo].[Staff] WHERE EmployeeNo = N'N003');  -- 蔡○柔
    INSERT INTO [dbo].[CareReminder]
      (UnitCode, BedId, PatientName, Gender, Age, Priority, Category, Content, RemindTime, PrimaryNurseStaffId, SortOrder) VALUES
    (N'W52', N'014', N'林○志', N'M', 75, N'高', N'術後照護', N'術後第3天傷口換藥，確認引流量並回報醫師',       N'08:30', @n2, 10),
    (N'W52', N'006', N'王○豪', N'M', 58, N'高', N'感控',     N'MRSA 接觸隔離：進出病室確實穿戴手套與隔離衣',     N'08:00', @n3, 20),
    (N'W52', N'018', N'黃○慧', N'F', 72, N'高', N'管路',     N'CVC 置入第7天，評估感染徵象，必要時通知醫師更換', N'09:00', @n2, 30),
    (N'W52', N'031', N'吳○仁', N'M', 80, N'中', N'跌倒防護', N'夜間意識混亂，床欄全拉起並每2小時安全評估',       N'06:45', @n3, 40),
    (N'W52', N'022', N'蔡○美', N'F', 63, N'中', N'藥物',     N'Warfarin 追蹤 PT/INR，結果回報後依醫囑調整劑量',  N'10:30', @n2, 50),
    (N'W52', N'034', N'鄭○婷', N'F', 38, N'低', N'出院準備', N'預計明日出院，完成出院衛教與門診掛號',           N'15:00', @n3, 60);
END
GO

PRINT N'[dbo].[CareReminder] 建立並植入 W52 照護提醒種子（責任護理師掛 N002/N003）。';
GO
