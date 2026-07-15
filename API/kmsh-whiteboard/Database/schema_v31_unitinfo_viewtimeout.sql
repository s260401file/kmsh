/* =============================================================================
   KMSH 頁首單位資訊 [dbo].[UnitInfo] 補欄：ViewTimeoutMinutes（v31）
   -----------------------------------------------------------------------------
   OR 檢視密碼「有效時間（分鐘）」：驗證通過後於該台裝置記住幾分鐘（1–10，NULL=預設 3）。
   與 ViewPassword（v30）搭配。冪等；可重複執行。
   ============================================================================= */
IF COL_LENGTH('dbo.UnitInfo','ViewTimeoutMinutes') IS NULL
    ALTER TABLE [dbo].[UnitInfo] ADD [ViewTimeoutMinutes] INT NULL;
GO

PRINT N'[dbo].[UnitInfo] 已補 ViewTimeoutMinutes 欄（OR 檢視密碼有效分鐘）。';
GO
