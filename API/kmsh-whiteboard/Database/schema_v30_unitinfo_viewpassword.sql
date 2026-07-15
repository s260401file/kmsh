/* =============================================================================
   KMSH 頁首單位資訊 [dbo].[UnitInfo] 補欄：ViewPassword（v30）
   -----------------------------------------------------------------------------
   OR 檢視密碼（4 位數）：設定後，前台看板切換至「非第一頁籤」需輸入此密碼才可檢視。
   NULL/空＝不設限。僅 OR 於後台「頁首設定」提供輸入；欄位為各站通用（未來可擴充）。
   冪等（COL_LENGTH 判存在）；可重複執行。
   ============================================================================= */
IF COL_LENGTH('dbo.UnitInfo','ViewPassword') IS NULL
    ALTER TABLE [dbo].[UnitInfo] ADD [ViewPassword] NVARCHAR(10) NULL;
GO

PRINT N'[dbo].[UnitInfo] 已補 ViewPassword 欄（OR 檢視密碼）。';
GO
