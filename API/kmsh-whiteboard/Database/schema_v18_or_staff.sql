/* =============================================================================
   KMSH 人員管理（v18）：重建 OR 人員主檔（依院方提供清單）
   -----------------------------------------------------------------------------
   1) 移除舊 OR 人員（OR 單位角色者；OR-only 連人員一併刪，並清其 OR 排班/勾床/查房）
   2) 建立新 OR 人員 13 名（分機/手機留空，職別＝護理師）
   備註：OR「手術派班」(OrShiftStaff/OrShiftRoom) 為另一自建表，不受此檔影響。可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

/* ── 1) 移除舊 OR 人員 ── */
DECLARE @orids TABLE (Id INT);
INSERT @orids SELECT DISTINCT StaffId FROM [dbo].[StaffUnitRole] WHERE UnitCode = N'OR';

DELETE FROM [dbo].[StaffSchedule]      WHERE UnitCode = N'OR';
DELETE FROM [dbo].[BedStaffAssignment] WHERE UnitCode = N'OR';
DELETE FROM [dbo].[DoctorRound]        WHERE UnitCode = N'OR';
DELETE FROM [dbo].[StaffUnitRole]      WHERE UnitCode = N'OR';

DELETE FROM [dbo].[Staff]
WHERE Id IN (SELECT Id FROM @orids)
  AND IsAdmin = 0
  AND NOT EXISTS (SELECT 1 FROM [dbo].[StaffUnitRole] r WHERE r.StaffId = [Staff].Id);
GO

/* ── 2) 建立新 OR 人員（分機/手機留空，職別 護理師） ── */
DECLARE @people TABLE (EmployeeNo NVARCHAR(20), Name NVARCHAR(50), SortOrder INT);
INSERT INTO @people VALUES
  (N'MB28', N'黃瑞珠', 10),
  (N'MB74', N'曾婉君', 20),
  (N'MC38', N'蔡念恆', 30),
  (N'M038', N'廖愛紘', 40),
  (N'M054', N'沈嬿妮', 50),
  (N'M123', N'詹郁貞', 60),
  (N'M175', N'沈銘蕙', 70),
  (N'M192', N'康寶丹', 80),
  (N'M354', N'蔡宜瑾', 90),
  (N'M412', N'余紫鈴', 100),
  (N'M425', N'簡貝慈', 110),
  (N'M486', N'李彥妮', 120),
  (N'M671', N'張嘉玲', 130);

INSERT INTO [dbo].[Staff] (EmployeeNo, Name, Ext, Mobile, IsAdmin, SortOrder)
SELECT p.EmployeeNo, p.Name, NULL, NULL, 0, p.SortOrder
FROM @people p
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[Staff] s WHERE s.EmployeeNo = p.EmployeeNo);

/* ── 3) OR 單位角色（護理師 / nurse 分組） ── */
INSERT INTO [dbo].[StaffUnitRole] (StaffId, UnitCode, Role, IsManager, GroupKey, SortOrder)
SELECT s.Id, N'OR', N'護理師', 0, N'nurse', s.SortOrder
FROM [dbo].[Staff] s
JOIN @people p ON p.EmployeeNo = s.EmployeeNo
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[StaffUnitRole] r WHERE r.StaffId = s.Id AND r.UnitCode = N'OR');
GO

PRINT N'[人員管理 v18] 已移除舊 OR 人員並建立新 OR 人員清單（13 名，護理師）。';
GO
