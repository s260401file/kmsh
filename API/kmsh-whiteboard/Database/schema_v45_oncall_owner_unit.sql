/* =============================================================================
   KMSH 值班醫師排程 加「所屬單位」＋呼吸治療科改日/夜兩班（v45）
   -----------------------------------------------------------------------------
   問題：值班醫師排程（OnCallDept＋OnCallRoster）為全院共用一張表，只是掛在
         「ER 管理」選單下由 ER 統一排。但呼吸治療科（DRT）實際由 ICU 排班（非
         ER），且同一天有兩班：日班 08:00-17:30、夜班 17:30-08:00（跨午夜）。
   修正：
     1) OnCallDept 加欄 OwnerUnit（所屬/排班單位）；既有科別回填 'ER'。
        排程頁科別下拉改依 OwnerUnit 過濾（ER 管理只列 ER 科、ICU 管理只列 ICU 科），
        各自維護、互不干擾。OwnerUnit=NULL 者不受過濾（顯示端「引用」仍不過濾）。
     2) DRT（呼吸治療科）改 OwnerUnit='ICU'、Slots='日班,夜班'。
        Slots 逗號分隔即驅動月曆每日兩格；OnCallRoster 以 Slot 區分兩列，零 schema 變更。
        看板挑選（BuildOnCallEntry）依當下時間帶日/夜班醫師（08:00-17:30 日班，餘夜班），
        與既有 08:00 交班切點（OnCallEffectiveDate）天然對齊。
   以 sqlcmd 套用請加 -f 65001（UTF-8）；或用 SSMS。可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

-- 1) 加欄 OwnerUnit（可重跑）
IF COL_LENGTH('dbo.OnCallDept', 'OwnerUnit') IS NULL
BEGIN
    ALTER TABLE [dbo].[OnCallDept] ADD [OwnerUnit] NVARCHAR(20) NULL;
    PRINT N'[dbo].[OnCallDept] 已新增欄位 OwnerUnit。';
END
GO

-- 欄位描述 memo（可重跑）
IF NOT EXISTS (
    SELECT 1 FROM sys.extended_properties
    WHERE major_id = OBJECT_ID('dbo.OnCallDept')
      AND minor_id = COLUMNPROPERTY(OBJECT_ID('dbo.OnCallDept'), 'OwnerUnit', 'ColumnId')
      AND name = 'MS_Description')
BEGIN
    EXEC sys.sp_addextendedproperty
        @name = N'MS_Description',
        @value = N'所屬/排班單位（ER/ICU…）。後台排程頁科別下拉依此過濾；NULL 不過濾。顯示端「引用」不受此限。',
        @level0type = N'SCHEMA', @level0name = N'dbo',
        @level1type = N'TABLE',  @level1name = N'OnCallDept',
        @level2type = N'COLUMN', @level2name = N'OwnerUnit';
END
GO

-- 2) 既有科別回填 OwnerUnit='ER'（原由 ER 統一排；僅補 NULL 者）
UPDATE [dbo].[OnCallDept] SET OwnerUnit = N'ER' WHERE OwnerUnit IS NULL;
GO

-- 3) 呼吸治療科（DRT）改由 ICU 排、日/夜兩班
UPDATE [dbo].[OnCallDept]
   SET OwnerUnit = N'ICU',
       Slots     = N'日班,夜班',
       UpdatedAt = GETDATE()
 WHERE DeptCode = N'DRT';
GO

PRINT N'[dbo].[OnCallDept] OwnerUnit 回填完成；呼吸治療科（DRT）→ OwnerUnit=ICU、Slots=日班,夜班。';
GO
