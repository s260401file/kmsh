/* =============================================================================
   KMSH 夜間及假日護理師值班表 [dbo].[NightNurseRoster]（v40）
   -----------------------------------------------------------------------------
   全院夜/假護理師每日值班（參考紙本「夜間及假日護理師值班表」）。功能同值班醫師排程，
   但無科別、只選月份；每日兩個時段：小夜、小夜貳組（皆 16-02）。護理師姓名先純文字。
   鍵＝日期+時段（一日一時段一列）。月存採「先刪該月、再插入」覆寫。
   以 sqlcmd 套用請加 -f 65001（UTF-8）。可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[NightNurseRoster]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[NightNurseRoster] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [OnCallDate] DATE          NOT NULL,          -- 值班日期
        [Slot]       NVARCHAR(20)  NOT NULL,          -- 時段：小夜 / 小夜貳組
        [Name]       NVARCHAR(50)  NULL,              -- 護理師姓名（純文字）
        [SortOrder]  INT           NOT NULL CONSTRAINT DF_NNR_Sort DEFAULT(0),
        [IsActive]   BIT           NOT NULL CONSTRAINT DF_NNR_Active DEFAULT(1),
        [UpdatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT DF_NNR_Upd DEFAULT(GETDATE()),
        [CreatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT DF_NNR_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_NightNurseRoster] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_NNR_Date ON [dbo].[NightNurseRoster] ([OnCallDate]);
END
GO

PRINT N'[dbo].[NightNurseRoster] 建立完成（夜/假護理師值班表）。';
GO
