/* =============================================================================
   KMSH 護理行政值班表 [dbo].[AdminDutyRoster]（v41）
   -----------------------------------------------------------------------------
   護理科每月行政值班（參考紙本「護理行政值班表」）。設定方式同夜/假護理師排程，
   但每日三個時段：大夜、白班、小夜。護理師姓名純文字。
   鍵＝日期+時段（一日一時段一列）。月存採「先刪該月、再插入」覆寫。
   以 sqlcmd 套用請加 -f 65001（UTF-8）。可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[AdminDutyRoster]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AdminDutyRoster] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [OnCallDate] DATE          NOT NULL,          -- 值班日期
        [Slot]       NVARCHAR(20)  NOT NULL,          -- 時段：大夜 / 白班 / 小夜
        [Name]       NVARCHAR(50)  NULL,              -- 護理師姓名（純文字）
        [SortOrder]  INT           NOT NULL CONSTRAINT DF_ADR_Sort DEFAULT(0),
        [IsActive]   BIT           NOT NULL CONSTRAINT DF_ADR_Active DEFAULT(1),
        [UpdatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT DF_ADR_Upd DEFAULT(GETDATE()),
        [CreatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT DF_ADR_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_AdminDutyRoster] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_ADR_Date ON [dbo].[AdminDutyRoster] ([OnCallDate]);
END
GO

PRINT N'[dbo].[AdminDutyRoster] 建立完成（護理行政值班表）。';
GO
