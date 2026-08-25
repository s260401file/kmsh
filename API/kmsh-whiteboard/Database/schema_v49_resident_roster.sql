/* =============================================================================
   KMSH 當日住院醫師排班 [dbo].[ResidentRoster]（v49）
   -----------------------------------------------------------------------------
   各站（先用 W52）每日「住院醫師」排班，月曆型（比照當日專師排班）。
   純手動 keyin 姓名（住院醫師多為輪訓/外院，不綁人員主檔）；無科別/分機。
   前台 {unit}/schedule 的住院醫師改讀此表（依日期，day-level，跨班相同）。
   鍵＝UnitCode＋日期（可多列＝多位）。月存採「先刪該站該月、再插入」覆寫。
   以 sqlcmd 套用請加 -f 65001（UTF-8）。可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[ResidentRoster]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ResidentRoster] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [UnitCode]   NVARCHAR(20)  NOT NULL,          -- 站別（W52…）
        [OnCallDate] DATE          NOT NULL,          -- 值班日期
        [Name]       NVARCHAR(50)  NULL,              -- 住院醫師姓名（純文字）
        [SortOrder]  INT           NOT NULL CONSTRAINT DF_RSR_Sort DEFAULT(0),
        [IsActive]   BIT           NOT NULL CONSTRAINT DF_RSR_Active DEFAULT(1),
        [UpdatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT DF_RSR_Upd DEFAULT(GETDATE()),
        [CreatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT DF_RSR_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_ResidentRoster] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_RSR_UnitDate ON [dbo].[ResidentRoster] ([UnitCode], [OnCallDate]);
END
GO

PRINT N'[dbo].[ResidentRoster] 建立完成（當日住院醫師排班）。';
GO
