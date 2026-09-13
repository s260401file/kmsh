/* =============================================================================
   KMSH 值班醫師排程 新增科別「胸腔外科」（v51）
   -----------------------------------------------------------------------------
   需求：ER 管理 › 值班醫師排程 科別下拉新增「胸腔外科」，排班方式同外傷小組：
         單一全日格、1 天 1 人（Slots=NULL）。
   內容：MERGE 補一列 OnCallDept：
         DeptCode='CTS'、DeptName='胸腔外科'、OwnerUnit='ER'、
         Slots=NULL(單一全日/1天1人)、DoctorSource=NULL(預設 Doctor 主檔＋可自由輸入)、
         SortOrder=110（心臟血管外科 CVS=100 之後、大外科=120 之前）。
   純資料設定；前端下拉/月曆/醫師選單皆資料驅動，免改程式、免部署（API 直讀 DB）。
   以 sqlcmd 套用請加 -f 65001（UTF-8）與 -d Whiteboard；可重複執行（冪等）。
   ============================================================================= */
SET NOCOUNT ON;
GO

MERGE [dbo].[OnCallDept] AS t
USING (VALUES (N'CTS', N'胸腔外科', 110)) AS s (DeptCode, DeptName, SortOrder)
  ON t.DeptCode = s.DeptCode
WHEN NOT MATCHED THEN
  INSERT (DeptCode, DeptName, Slots, OwnerUnit, DoctorSource, SortOrder, IsActive, UpdatedAt, CreatedAt)
  VALUES (s.DeptCode, s.DeptName, NULL, N'ER', NULL, s.SortOrder, 1, GETDATE(), GETDATE());

PRINT N'[v51] OnCallDept 已補入 胸腔外科（CTS）：OwnerUnit=ER、Slots=NULL(1天1人)、DoctorSource=預設。';
GO
