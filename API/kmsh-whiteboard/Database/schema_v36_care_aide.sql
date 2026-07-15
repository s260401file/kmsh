/* =============================================================================
   KMSH 照服員主檔 [dbo].[CareAide]（v36）
   -----------------------------------------------------------------------------
   全院共用之照服員（照顧服務員）總表：姓名＋單一聯絡方式（分機／電話，自由填）。
   供各站看板「照服員」區塊日後引用顯示（前台應用另議）。比照 Department 主檔樣式。
   以 sqlcmd 套用請加 -f 65001（UTF-8）；或用 SSMS。可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[CareAide]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[CareAide] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [Name]      NVARCHAR(50)  NOT NULL,          -- 照服員姓名
        [Contact]   NVARCHAR(50)  NULL,              -- 聯絡方式（分機／電話，自由填）
        [SortOrder] INT           NOT NULL CONSTRAINT DF_CareAide_Sort DEFAULT(0),
        [IsActive]  BIT           NOT NULL CONSTRAINT DF_CareAide_Active DEFAULT(1),
        [UpdatedAt] DATETIME2(0)  NOT NULL CONSTRAINT DF_CareAide_Upd DEFAULT(GETDATE()),
        [CreatedAt] DATETIME2(0)  NOT NULL CONSTRAINT DF_CareAide_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_CareAide] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_CareAide_Sort ON [dbo].[CareAide] ([SortOrder], [Id]);
END
GO

PRINT N'[dbo].[CareAide] 建立完成（照服員主檔）。';
GO
