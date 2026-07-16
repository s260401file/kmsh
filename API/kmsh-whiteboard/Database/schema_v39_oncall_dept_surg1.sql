/* =============================================================================
   KMSH 值班醫師排程 新增科別 大外科（代碼 --）到 [dbo].[OnCallDept]（v39）
   -----------------------------------------------------------------------------
   同 schema_v34（DRT）：值班醫師排程科別下拉來自 OnCallDept，與科別主檔 Department
   不同表。使用者在主檔新增「大外科」(Department.Code = '--')，需於 OnCallDept
   補對應列才會出現在排程科別下拉。DeptCode 必須與 Department.Code / Doctor.DeptCode
   完全一致（此處為 '--'）。以 sqlcmd 套用請加 -f 65001（UTF-8）。可重複執行（MERGE）。
   註：代碼 '--' 為使用者於主檔輸入之值；若日後改用正式代碼，需同步更新 Department 與本表。
   ============================================================================= */
SET NOCOUNT ON;
GO

MERGE [dbo].[OnCallDept] AS t
USING (VALUES
  (N'--', N'大外科', NULL, 120)
) AS s (DeptCode,DeptName,Slots,SortOrder)
ON (t.DeptCode=s.DeptCode)
WHEN NOT MATCHED THEN
  INSERT (DeptCode,DeptName,Slots,SortOrder,IsActive,UpdatedAt,CreatedAt)
  VALUES (s.DeptCode,s.DeptName,s.Slots,s.SortOrder,1,GETDATE(),GETDATE());
GO

PRINT N'[dbo].[OnCallDept] 已補入 大外科（代碼 --）。';
GO
