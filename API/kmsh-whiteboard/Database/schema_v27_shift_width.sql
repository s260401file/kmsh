/* =============================================================================
   KMSH StaffSchedule.Shift 欄位加寬 NVARCHAR(10) -> NVARCHAR(20)（v27）
   -----------------------------------------------------------------------------
   ER 三班護理師新增第 4 班，班名用時間「12:00-20:00」(11 字) 超過原 NVARCHAR(10)。
   加寬相容既有資料（大夜/白班/小夜），可重複執行。
   以 sqlcmd 套用請加 -f 65001（UTF-8）；或用 SSMS 開啟執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'[dbo].[StaffSchedule]')
      AND c.name = N'Shift' AND t.name = N'nvarchar' AND c.max_length < 40
)
BEGIN
    ALTER TABLE [dbo].[StaffSchedule] ALTER COLUMN [Shift] NVARCHAR(20) NOT NULL;
    PRINT N'[dbo].[StaffSchedule].[Shift] 已加寬為 NVARCHAR(20)。';
END
ELSE
    PRINT N'[dbo].[StaffSchedule].[Shift] 已是 NVARCHAR(20) 以上，略過。';
GO
