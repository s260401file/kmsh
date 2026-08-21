/* =============================================================================
   KMSH 值班醫師排程 新增科別「急診科」＋醫師來源標記 DoctorSource（v46）
   -----------------------------------------------------------------------------
   需求：ER 管理 › 值班醫師排程 新增「急診科」。
     - 醫師來源＝ER 管理的「急診醫師」(ErDoctor 主檔)，非一般 Doctor 主檔。
     - 區分日班／夜班、排整月（同呼吸治療科 DRT 的日/夜兩班模式）。
   修正：
     1) OnCallDept 加欄 DoctorSource（醫師下拉來源）：
        NULL＝預設(Doctor 主檔依 DeptCode)；'ErDoctor'＝急診醫師主檔。
        後台排程頁只依此決定醫師下拉呼叫 getDoctors 或 getErDoctors。
     2) 補一列 急診科：DeptCode='ER'、OwnerUnit='ER'、Slots='日班,夜班'、DoctorSource='ErDoctor'。
        Slots 逗號分隔即驅動月曆每日兩格（日/夜），OnCallRoster 以 Slot 分列，零 schema 邏輯變更。
        DeptCode='ER' 為純識別碼（因走 ErDoctor 覆寫，不需對應 Department/Doctor）。
   註：初版曾用 DeptCode='EM'，本版一律改為 'ER'（顯示 急診科(ER)）；下方含冪等 EM→ER 遷移。
   以 sqlcmd 套用請加 -f 65001（UTF-8）；或用 SSMS。可重複執行（冪等）。
   ============================================================================= */
SET NOCOUNT ON;
GO

-- 1) 加欄 DoctorSource（可重跑）
IF COL_LENGTH('dbo.OnCallDept', 'DoctorSource') IS NULL
BEGIN
    ALTER TABLE [dbo].[OnCallDept] ADD [DoctorSource] NVARCHAR(20) NULL;
    PRINT N'[dbo].[OnCallDept] 已新增欄位 DoctorSource。';
END
GO

-- 欄位描述 memo（可重跑）
IF NOT EXISTS (
    SELECT 1 FROM sys.extended_properties
    WHERE major_id = OBJECT_ID('dbo.OnCallDept')
      AND minor_id = COLUMNPROPERTY(OBJECT_ID('dbo.OnCallDept'), 'DoctorSource', 'ColumnId')
      AND name = 'MS_Description')
BEGIN
    EXEC sys.sp_addextendedproperty
        @name = N'MS_Description',
        @value = N'醫師下拉來源：NULL＝Doctor 主檔(依 DeptCode)；ErDoctor＝急診醫師主檔。',
        @level0type = N'SCHEMA', @level0name = N'dbo',
        @level1type = N'TABLE',  @level1name = N'OnCallDept',
        @level2type = N'COLUMN', @level2name = N'DoctorSource';
END
GO

-- 2) 冪等遷移：舊 DeptCode='EM' → 'ER'（僅在尚無 'ER' 列時，避免違反唯一鍵）
IF EXISTS (SELECT 1 FROM [dbo].[OnCallDept] WHERE DeptCode = N'EM')
   AND NOT EXISTS (SELECT 1 FROM [dbo].[OnCallDept] WHERE DeptCode = N'ER')
BEGIN
    UPDATE [dbo].[OnCallRoster] SET DeptCode = N'ER' WHERE DeptCode = N'EM';
    IF COL_LENGTH('dbo.UnitOnCallDept', 'DeptCode') IS NOT NULL
        UPDATE [dbo].[UnitOnCallDept] SET DeptCode = N'ER' WHERE DeptCode = N'EM';
    UPDATE [dbo].[OnCallDept] SET DeptCode = N'ER' WHERE DeptCode = N'EM';
    PRINT N'[dbo].[OnCallDept] 急診科 DeptCode 已由 EM 遷移為 ER（含 OnCallRoster/UnitOnCallDept）。';
END
GO

-- 3) 補入「急診科」（MERGE，不覆蓋既有；DeptCode 唯一）
MERGE [dbo].[OnCallDept] AS t
USING (VALUES
  (N'ER', N'急診科', N'日班,夜班', 5)
) AS s (DeptCode,DeptName,Slots,SortOrder)
ON (t.DeptCode=s.DeptCode)
WHEN NOT MATCHED THEN
  INSERT (DeptCode,DeptName,Slots,OwnerUnit,DoctorSource,SortOrder,IsActive,UpdatedAt,CreatedAt)
  VALUES (s.DeptCode,s.DeptName,s.Slots,N'ER',N'ErDoctor',s.SortOrder,1,GETDATE(),GETDATE());
GO

-- 4) 冪等修正（即使急診科列先前已存在，也確保設定正確）
UPDATE [dbo].[OnCallDept]
   SET DeptName     = N'急診科',
       OwnerUnit    = N'ER',
       Slots        = N'日班,夜班',
       DoctorSource = N'ErDoctor',
       IsActive     = 1,
       UpdatedAt    = GETDATE()
 WHERE DeptCode = N'ER';
GO

PRINT N'[dbo].[OnCallDept] 已補入 急診科（ER）：OwnerUnit=ER、Slots=日班,夜班、DoctorSource=ErDoctor。';
GO
