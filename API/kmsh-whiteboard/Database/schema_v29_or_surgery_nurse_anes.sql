/* =============================================================================
   KMSH OrSurgeryNurse 加欄 AnesNurse（麻醉人員）（v29）
   -----------------------------------------------------------------------------
   逐台刀覆蓋加「麻醉」欄，供手術清單「刷手/流動/麻醉」欄顯示。可重複執行。
   以 sqlcmd 套用請加 -f 65001（UTF-8）；或用 SSMS 執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[OrSurgeryNurse]', N'U') IS NOT NULL
   AND COL_LENGTH(N'[dbo].[OrSurgeryNurse]', N'AnesNurse') IS NULL
BEGIN
    ALTER TABLE [dbo].[OrSurgeryNurse] ADD [AnesNurse] NVARCHAR(50) NULL;
    PRINT N'[dbo].[OrSurgeryNurse] 已加欄 AnesNurse。';
END
ELSE
    PRINT N'AnesNurse 已存在或表不存在，略過。';
GO
