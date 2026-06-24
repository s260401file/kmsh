/* =============================================================================
   KMSH UnitInfo 補「總病床數」覆寫欄位 [TotalBeds]（v10）
   -----------------------------------------------------------------------------
   ER 急診統計「總床數」可由頁首設定覆寫：NULL=預設 19；有值（含 1/0）即顯示該值。
   一般欄位、預設 NULL（不覆寫）。可重複執行（COL_LENGTH 保護）。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.UnitInfo','TotalBeds') IS NULL
    ALTER TABLE [dbo].[UnitInfo] ADD [TotalBeds] INT NULL;   -- 總病床數覆寫（NULL=用預設）
GO

PRINT N'[dbo].[UnitInfo] 已補 TotalBeds 欄位（總病床數覆寫）。';
GO
