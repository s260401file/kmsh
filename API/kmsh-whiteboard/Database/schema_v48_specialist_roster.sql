/* =============================================================================
   KMSH 當日專師排班 [dbo].[SpecialistRoster]（v48）
   -----------------------------------------------------------------------------
   各站（先用 W52）每日「專科護理師」排班，月曆型（比照值班醫師排程/夜假護理師值班表）。
   無科別、只選月份；一天可多位（多列）；下拉挑該站人員，存 StaffId＋姓名/科別/分機快照。
   前台 {unit}/schedule 的專科護理師改讀此表（依日期，day-level，跨班相同）。
   鍵＝UnitCode＋日期（可多列）。月存採「先刪該站該月、再插入」覆寫。
   以 sqlcmd 套用請加 -f 65001（UTF-8）。可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[SpecialistRoster]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[SpecialistRoster] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [UnitCode]   NVARCHAR(20)  NOT NULL,          -- 站別（W52/ICU…）
        [OnCallDate] DATE          NOT NULL,          -- 值班日期
        [StaffId]    INT           NULL,              -- 對應人員（下拉來源；可為 null 供純手填）
        [Name]       NVARCHAR(50)  NULL,              -- 姓名（快照）
        [Department] NVARCHAR(50)  NULL,              -- 專科/科別（快照，顯示用）
        [Ext]        NVARCHAR(30)  NULL,              -- 分機（快照）
        [SortOrder]  INT           NOT NULL CONSTRAINT DF_SPR_Sort DEFAULT(0),
        [IsActive]   BIT           NOT NULL CONSTRAINT DF_SPR_Active DEFAULT(1),
        [UpdatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT DF_SPR_Upd DEFAULT(GETDATE()),
        [CreatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT DF_SPR_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_SpecialistRoster] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_SPR_UnitDate ON [dbo].[SpecialistRoster] ([UnitCode], [OnCallDate]);
END
GO

PRINT N'[dbo].[SpecialistRoster] 建立完成（當日專師排班）。';
GO
