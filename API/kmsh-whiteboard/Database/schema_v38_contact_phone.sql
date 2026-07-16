/* =============================================================================
   KMSH 值班表「聯絡電話」清單 [dbo].[ContactPhone]（v38）
   -----------------------------------------------------------------------------
   各單位（先做 W52）值班表面板「聯絡電話」區塊之可維護清單。比照常用電話 CommonContact，
   但多一個「標題」欄（可空），前台顯示為「標題 名稱 分機/電話」（如：書記 張聖宗 0265166）。
   以 UnitCode 分單位、IsActive 控啟用、SortOrder 控排序。與 CommonContact 各自獨立
   （常用電話用於連絡資訊分頁；本表用於值班表面板）。以 sqlcmd 套用請加 -f 65001（UTF-8）。
   可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[ContactPhone]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ContactPhone] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [UnitCode]  NVARCHAR(20)  NOT NULL,          -- 所屬單位 W52/ICU/…
        [Title]     NVARCHAR(50)  NULL,              -- 標題（可空，如 書記/警衛）
        [Name]      NVARCHAR(50)  NOT NULL,          -- 名稱（人員或單位）
        [Extension] NVARCHAR(50)  NULL,              -- 分機／電話
        [SortOrder] INT           NOT NULL CONSTRAINT DF_ContactPhone_Sort DEFAULT(0),
        [IsActive]  BIT           NOT NULL CONSTRAINT DF_ContactPhone_Active DEFAULT(1),
        [UpdatedAt] DATETIME2(0)  NOT NULL CONSTRAINT DF_ContactPhone_Upd DEFAULT(GETDATE()),
        [CreatedAt] DATETIME2(0)  NOT NULL CONSTRAINT DF_ContactPhone_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_ContactPhone] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_ContactPhone_Unit ON [dbo].[ContactPhone] ([UnitCode], [SortOrder], [Id]);
END
GO

PRINT N'[dbo].[ContactPhone] 建立完成（值班表聯絡電話清單）。';
GO
