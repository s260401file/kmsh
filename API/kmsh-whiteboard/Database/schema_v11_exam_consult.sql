/* =============================================================================
   KMSH 檢查/會診 自建表 [dbo].[WardExamConsult]（v11，W52/ICU/ER 共用）
   -----------------------------------------------------------------------------
   院方 OR.ORDER/RESULT 未開放 → 先自建。檢查/會診共表（Kind 區分），後台可增刪改。
   看板僅顯示「設定時間（UpdatedAt）」起 24 小時內的項目，逾時自動下板。
   不植入種子（改由後台以在床病人逐一設定）。可重複執行（OBJECT_ID）。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[WardExamConsult]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[WardExamConsult] (
        [Id]            INT IDENTITY(1,1) NOT NULL,
        [UnitCode]      NVARCHAR(20)  NOT NULL,            -- W52/ICU/ER
        [Kind]          NVARCHAR(10)  NOT NULL,            -- 檢查 / 會診
        [Hhisnum]       NVARCHAR(20)  NULL,                -- 病歷號（選填）
        [BedId]         NVARCHAR(20)  NULL,                -- 床號
        [PatientName]   NVARCHAR(50)  NULL,
        [Gender]        NVARCHAR(2)   NULL,
        [ItemName]      NVARCHAR(100) NULL,                -- 檢查項目 或 會診科別
        [Doctor]        NVARCHAR(50)  NULL,                -- 會診醫師（檢查留空）
        [ScheduledDate] NVARCHAR(20)  NULL,                -- 預定日期
        [TimeSlot]      NVARCHAR(30)  NULL,                -- 時段（如「上午 09:00」）
        [CompletedTime] NVARCHAR(30)  NULL,                -- 會診完成時間
        [Status]        NVARCHAR(20)  NULL,                -- 待執行/執行中/已完成/待回覆/已回覆…
        [Notes]         NVARCHAR(200) NULL,
        [SortOrder]     INT NOT NULL CONSTRAINT DF_WEC_Sort     DEFAULT(0),
        [IsActive]      BIT NOT NULL CONSTRAINT DF_WEC_IsActive DEFAULT(1),
        [UpdatedAt]     DATETIME2(0) NOT NULL CONSTRAINT DF_WEC_Updated DEFAULT(GETDATE()),
        [CreatedAt]     DATETIME2(0) NOT NULL CONSTRAINT DF_WEC_Created DEFAULT(GETDATE()),
        CONSTRAINT [PK_WardExamConsult] PRIMARY KEY CLUSTERED ([Id])
    );
END
GO

PRINT N'[dbo].[WardExamConsult] 已就緒（不植入種子；由後台以在床病人逐一設定）。';
GO
