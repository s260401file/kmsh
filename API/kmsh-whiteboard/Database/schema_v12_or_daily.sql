/* =============================================================================
   KMSH OR 當日手術快照 [dbo].[OrDailySurgery]（v12）
   -----------------------------------------------------------------------------
   Board_OR 為即時排程、完成後從清單消失（無狀態欄）→ 純讀會使當日總刀數遞減。
   本表「累積」當日出現過的每台刀；從院方清單消失者標記 Completed=1（視為已完成）。
   讓 GetOr/GetOrSurgeries 讀此表 → 當日總刀數穩定、已完成可見。可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[OrDailySurgery]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OrDailySurgery] (
        [Id]          INT IDENTITY(1,1) NOT NULL,
        [SurgeryDate] DATE          NOT NULL,            -- 手術日期
        [Hhisnum]     NVARCHAR(20)  NOT NULL,            -- 病歷號
        [ApiRoom]     NVARCHAR(20)  NULL,                -- Board_OR 刀房代碼 R1…
        [RoomId]      NVARCHAR(20)  NULL,                -- 對應白板房號 OR-xx
        [PatientName] NVARCHAR(50)  NULL,
        [Gender]      NVARCHAR(2)   NULL,
        [BirthDate]   NVARCHAR(30)  NULL,
        [SurgeryName] NVARCHAR(200) NULL,
        [Doctor]      NVARCHAR(50)  NULL,                -- 主刀
        [Department]  NVARCHAR(50)  NULL,                -- 科別代碼（Board_OR 提供，如 PS）
        [AnesType]    NVARCHAR(20)  NULL,
        [Source]      NVARCHAR(20)  NULL,
        [OpTime]      NVARCHAR(10)  NOT NULL CONSTRAINT DF_ODS_OpTime DEFAULT(''),  -- 手術時間 HH:mm
        [Diagnosis]   NVARCHAR(200) NULL,
        [Completed]   BIT NOT NULL CONSTRAINT DF_ODS_Completed DEFAULT(0),          -- 1=已從院方清單消失（視為已完成）
        [FirstSeenAt] DATETIME2(0) NOT NULL CONSTRAINT DF_ODS_First DEFAULT(GETDATE()),
        [LastSeenAt]  DATETIME2(0) NOT NULL CONSTRAINT DF_ODS_Last  DEFAULT(GETDATE()),
        [UpdatedAt]   DATETIME2(0) NOT NULL CONSTRAINT DF_ODS_Updated DEFAULT(GETDATE()),
        [CreatedAt]   DATETIME2(0) NOT NULL CONSTRAINT DF_ODS_Created DEFAULT(GETDATE()),
        CONSTRAINT [PK_OrDailySurgery] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_OrDailySurgery] UNIQUE ([SurgeryDate],[ApiRoom],[Hhisnum],[OpTime])
    );
END
GO

-- 既有資料庫補欄：科別（Board_OR 2026-07 起提供）。可重複執行。
IF COL_LENGTH(N'[dbo].[OrDailySurgery]', N'Department') IS NULL
    ALTER TABLE [dbo].[OrDailySurgery] ADD [Department] NVARCHAR(50) NULL;
GO

PRINT N'[dbo].[OrDailySurgery] 當日手術快照表建立完成（含科別）。';
GO
