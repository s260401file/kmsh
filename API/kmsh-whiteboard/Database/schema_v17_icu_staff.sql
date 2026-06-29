/* =============================================================================
   KMSH 人員管理（v17）：重建 ICU 人員主檔（依院方提供清單）
   -----------------------------------------------------------------------------
   1) 移除舊 ICU 人員（ICU 單位角色者；ICU-only 連人員一併刪，並清其 ICU 排班/勾床/查房）
   2) 建立新 ICU 人員 25 名（分機/手機留空，職別＝護理師）
   備註：員編 M173 重複（鄭婷／張簡明忠）→ 張簡明忠暫用佔位員編 M173-2；
        「N2邱佩貞」依指示原樣存為姓名。可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

/* ── 1) 移除舊 ICU 人員 ── */
DECLARE @icu TABLE (Id INT);
INSERT @icu SELECT DISTINCT StaffId FROM [dbo].[StaffUnitRole] WHERE UnitCode = N'ICU';

DELETE FROM [dbo].[StaffSchedule]      WHERE UnitCode = N'ICU';
DELETE FROM [dbo].[BedStaffAssignment] WHERE UnitCode = N'ICU';
DELETE FROM [dbo].[DoctorRound]        WHERE UnitCode = N'ICU';
DELETE FROM [dbo].[StaffUnitRole]      WHERE UnitCode = N'ICU';

DELETE FROM [dbo].[Staff]
WHERE Id IN (SELECT Id FROM @icu)
  AND IsAdmin = 0
  AND NOT EXISTS (SELECT 1 FROM [dbo].[StaffUnitRole] r WHERE r.StaffId = [Staff].Id);
GO

/* ── 2) 建立新 ICU 人員（分機/手機留空） ── */
DECLARE @people TABLE (EmployeeNo NVARCHAR(20), Name NVARCHAR(50), SortOrder INT);
INSERT INTO @people VALUES
  (N'MB65',   N'吳美瑛',     10),
  (N'M008',   N'N2邱佩貞',   20),
  (N'M059',   N'雷嵎茜',     30),
  (N'M182',   N'許尹穎',     40),
  (N'M150',   N'蕭伊秦',     50),
  (N'M173',   N'鄭婷',       60),
  (N'M173-2', N'張簡明忠',   70),   -- 員編與鄭婷重複，暫用佔位 M173-2
  (N'M208',   N'高佩君',     80),
  (N'M184',   N'周玠汶',     90),
  (N'M226',   N'宋翊菱',     100),
  (N'M227',   N'畢勻柔',     110),
  (N'M274',   N'李妍萱',     120),
  (N'M241',   N'李子揚',     130),
  (N'M254',   N'江冠衛',     140),
  (N'M258',   N'林王筠蓁',   150),
  (N'MC09',   N'張惠雯',     160),
  (N'MC21',   N'陳維鋌',     170),
  (N'MC31',   N'孫晨婼',     180),
  (N'MC48',   N'蘇宜文',     190),
  (N'MC51',   N'戴宜華',     200),
  (N'M309',   N'蘇紋如',     210),
  (N'M344',   N'陳月惠',     220),
  (N'M388',   N'蔡善鈞',     230),
  (N'M406',   N'陳泳禎',     240),
  (N'M675',   N'林碧霞',     250);

INSERT INTO [dbo].[Staff] (EmployeeNo, Name, Ext, Mobile, IsAdmin, SortOrder)
SELECT p.EmployeeNo, p.Name, NULL, NULL, 0, p.SortOrder
FROM @people p
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[Staff] s WHERE s.EmployeeNo = p.EmployeeNo);

/* ── 3) ICU 單位角色（護理師 / nurse 分組） ── */
INSERT INTO [dbo].[StaffUnitRole] (StaffId, UnitCode, Role, IsManager, GroupKey, SortOrder)
SELECT s.Id, N'ICU', N'護理師', 0, N'nurse', s.SortOrder
FROM [dbo].[Staff] s
JOIN @people p ON p.EmployeeNo = s.EmployeeNo
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[StaffUnitRole] r WHERE r.StaffId = s.Id AND r.UnitCode = N'ICU');
GO

PRINT N'[人員管理 v17] 已移除舊 ICU 人員並建立新 ICU 人員清單（25 名，護理師）。';
GO
