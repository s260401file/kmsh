/* =============================================================================
   KMSH 各單位「顯示照服員」選取對映表 [dbo].[UnitCareAide]（v37）
   -----------------------------------------------------------------------------
   照服員主檔 CareAide 為全院共用；各單位（先做 W52）於後台選取要在自己白板顯示的
   照服員並排序。本表只存「單位×照服員×順序」對映；姓名／聯絡方式顯示時由 CareAide
   join 帶出。比照 UnitOnCallDept 樣式。以 sqlcmd 套用請加 -f 65001（UTF-8）。可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[UnitCareAide]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[UnitCareAide] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [UnitCode]  NVARCHAR(20)  NOT NULL,          -- 顯示單位 W52/ICU/…
        [AideId]    INT           NOT NULL,          -- 對應 CareAide.Id
        [SortOrder] INT           NOT NULL CONSTRAINT DF_UCA_Sort DEFAULT(0),
        [IsActive]  BIT           NOT NULL CONSTRAINT DF_UCA_Active DEFAULT(1),
        [UpdatedAt] DATETIME2(0)  NOT NULL CONSTRAINT DF_UCA_Upd DEFAULT(GETDATE()),
        [CreatedAt] DATETIME2(0)  NOT NULL CONSTRAINT DF_UCA_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_UnitCareAide] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_UnitCareAide] UNIQUE ([UnitCode],[AideId])
    );
    CREATE INDEX IX_UnitCareAide_Unit ON [dbo].[UnitCareAide] ([UnitCode]);
END
GO

PRINT N'[dbo].[UnitCareAide] 建立完成（各單位顯示照服員選取＋順序）。';
GO
