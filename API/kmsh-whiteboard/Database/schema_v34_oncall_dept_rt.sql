/* =============================================================================
   KMSH 值班醫師排程 新增科別 呼吸治療科（DRT）到 [dbo].[OnCallDept]（v34）
   -----------------------------------------------------------------------------
   問題：值班醫師排程的「科別」下拉來自 OnCallDept（schema_v26 僅植入 10 科），
         與科別/醫師主檔 Department/Doctor 是不同表。使用者在主檔新增了「呼吸治療科」
         (Department.Code=DRT，Doctor.DeptCode=DRT，3 名醫師)，但 OnCallDept 沒有對應列，
         故排程科別下拉看不到、無法排班。
   修正：於 OnCallDept 補一列 DRT／呼吸治療科（IsActive=1，單一時段 Slots=NULL）。
         DeptCode 必須與 Department.Code / Doctor.DeptCode 完全一致（=DRT），
         排班選此科時 getDoctors('DRT') 才會帶出那 3 名醫師。
   以 sqlcmd 套用請加 -f 65001（UTF-8）；或用 SSMS。可重複執行（MERGE，不覆蓋既有）。
   ============================================================================= */
SET NOCOUNT ON;
GO

MERGE [dbo].[OnCallDept] AS t
USING (VALUES
  (N'DRT', N'呼吸治療科', NULL, 110)
) AS s (DeptCode,DeptName,Slots,SortOrder)
ON (t.DeptCode=s.DeptCode)
WHEN NOT MATCHED THEN
  INSERT (DeptCode,DeptName,Slots,SortOrder,IsActive,UpdatedAt,CreatedAt)
  VALUES (s.DeptCode,s.DeptName,s.Slots,s.SortOrder,1,GETDATE(),GETDATE());
GO

PRINT N'[dbo].[OnCallDept] 已補入 呼吸治療科（DRT）。';
GO
