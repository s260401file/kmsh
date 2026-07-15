/* =============================================================================
   KMSH 各單位「引用值班醫師」科別選取對映表 [dbo].[UnitOnCallDept]（v35）
   -----------------------------------------------------------------------------
   醫師排班由 ER 每月統一完成（OnCallDept＋OnCallRoster）。其他單位（W52…）用引用
   方式，選取要在自己白板顯示的值班科別並排序。本表只存「單位×科別×順序」對映；
   醫師姓名/分機於顯示時即時由中央 OnCallRoster（當日值班）解析，不落地於此。
   鍵＝UnitCode+DeptCode（一單位一科一列）。以 sqlcmd 套用請加 -f 65001（UTF-8）。
   可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[UnitOnCallDept]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[UnitOnCallDept] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [UnitCode]  NVARCHAR(20)  NOT NULL,          -- 顯示單位 W52/ICU/…
        [DeptCode]  NVARCHAR(20)  NOT NULL,          -- 對應 OnCallDept.DeptCode
        [SortOrder] INT           NOT NULL CONSTRAINT DF_UOCD_Sort DEFAULT(0),
        [IsActive]  BIT           NOT NULL CONSTRAINT DF_UOCD_Active DEFAULT(1),
        [UpdatedAt] DATETIME2(0)  NOT NULL CONSTRAINT DF_UOCD_Upd DEFAULT(GETDATE()),
        [CreatedAt] DATETIME2(0)  NOT NULL CONSTRAINT DF_UOCD_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_UnitOnCallDept] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_UnitOnCallDept] UNIQUE ([UnitCode],[DeptCode])
    );
    CREATE INDEX IX_UnitOnCallDept_Unit ON [dbo].[UnitOnCallDept] ([UnitCode]);
END
GO

PRINT N'[dbo].[UnitOnCallDept] 建立完成（各單位引用值班科別選取＋順序）。';
GO
