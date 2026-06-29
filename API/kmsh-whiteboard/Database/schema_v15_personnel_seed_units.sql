/* =============================================================================
   KMSH 人員管理（v15）：補 ICU / OR / ER 三站人員種子
   -----------------------------------------------------------------------------
   v14 已植入 W52；本檔補其餘三站：人員主檔＋單位角色（各站含一名管理者）
   ＋今日排班；ICU 另含主護勾床示範。日期用今天，方便示範。
   以「單位是否已有角色」為守門，可重複執行不重複植入。
   ============================================================================= */
SET NOCOUNT ON;
GO

/* 人員主檔（員編不存在才插入） */
INSERT INTO [dbo].[Staff] (EmployeeNo, Name, Ext, Mobile, IsAdmin, SortOrder)
SELECT v.EmployeeNo, v.Name, v.Ext, v.Mobile, 0, v.SortOrder
FROM (VALUES
    -- ICU
    (N'IN01', N'高○蘭', N'5410', N'0921-200-001', 110),
    (N'IN02', N'方○婷', N'5401', N'0921-200-002', 120),
    (N'IN03', N'許○慧', N'5402', N'0921-200-003', 130),
    (N'IN04', N'童○瑜', N'5403', N'0921-200-004', 140),
    (N'IN05', N'葉○君', N'5404', N'0921-200-005', 150),
    (N'IS01', N'簡○芳', N'5420', N'0931-200-201', 160),
    (N'ID01', N'郭○華', N'5430', N'0911-200-301', 170),
    (N'IR01', N'范○丞', N'5431', N'0911-200-302', 180),
    -- OR
    (N'ON01', N'石○梅', N'5510', N'0922-300-001', 210),
    (N'ON02', N'白○潔', N'5501', N'0922-300-002', 220),
    (N'ON03', N'湯○琳', N'5502', N'0922-300-003', 230),
    (N'OA01', N'紀○安', N'5520', N'0933-300-201', 240),
    (N'OD01', N'蕭○宏', N'5530', N'0911-300-301', 250),
    -- ER
    (N'ERN1', N'尤○雯', N'5610', N'0923-400-001', 310),
    (N'ERN2', N'卓○寧', N'5601', N'0923-400-002', 320),
    (N'ERN3', N'温○蓉', N'5602', N'0923-400-003', 330),
    (N'ERN4', N'柯○晴', N'5603', N'0923-400-004', 340),
    (N'ERS1', N'武○潔', N'5620', N'0934-400-201', 350),
    (N'ERD1', N'雷○剛', N'5630', N'0911-400-301', 360),
    (N'ERR1', N'費○翔', N'5631', N'0911-400-302', 370)
) v(EmployeeNo, Name, Ext, Mobile, SortOrder)
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[Staff] s WHERE s.EmployeeNo = v.EmployeeNo);
GO

/* ── ICU 單位角色 ── */
IF NOT EXISTS (SELECT 1 FROM [dbo].[StaffUnitRole] WHERE UnitCode = N'ICU')
BEGIN
    INSERT INTO [dbo].[StaffUnitRole] (StaffId, UnitCode, Role, Department, IsManager, GroupKey, SortOrder)
    SELECT s.Id, N'ICU', v.Role, v.Department, v.IsManager, v.GroupKey, v.SortOrder
    FROM (VALUES
        (N'IN01', N'護理長',     N'ICU 護理科', 1, N'leader',     10),
        (N'IN02', N'護理師',     NULL,          0, N'nurse',      20),
        (N'IN03', N'護理師',     NULL,          0, N'nurse',      30),
        (N'IN04', N'護理師',     NULL,          0, N'nurse',      40),
        (N'IN05', N'護理師',     NULL,          0, N'nurse',      50),
        (N'IS01', N'專科護理師', N'重症照護',   0, N'specialist', 60),
        (N'ID01', N'主治醫師',   N'重症醫學',   0, N'attending',  70),
        (N'IR01', N'住院醫師',   N'內科',       0, N'resident',   80)
    ) v(EmpNo, Role, Department, IsManager, GroupKey, SortOrder)
    JOIN [dbo].[Staff] s ON s.EmployeeNo = v.EmpNo;
END
GO

/* ── OR 單位角色 ── */
IF NOT EXISTS (SELECT 1 FROM [dbo].[StaffUnitRole] WHERE UnitCode = N'OR')
BEGIN
    INSERT INTO [dbo].[StaffUnitRole] (StaffId, UnitCode, Role, Department, IsManager, GroupKey, SortOrder)
    SELECT s.Id, N'OR', v.Role, v.Department, v.IsManager, v.GroupKey, v.SortOrder
    FROM (VALUES
        (N'ON01', N'護理長',   N'OR 護理科',   1, N'leader',    10),
        (N'ON02', N'護理師',   N'刷手',        0, N'nurse',     20),
        (N'ON03', N'護理師',   N'流動',        0, N'nurse',     30),
        (N'OA01', N'護理師',   N'麻醉',        0, N'nurse',     40),
        (N'OD01', N'主治醫師', N'外科',        0, N'attending', 50)
    ) v(EmpNo, Role, Department, IsManager, GroupKey, SortOrder)
    JOIN [dbo].[Staff] s ON s.EmployeeNo = v.EmpNo;
END
GO

/* ── ER 單位角色 ── */
IF NOT EXISTS (SELECT 1 FROM [dbo].[StaffUnitRole] WHERE UnitCode = N'ER')
BEGIN
    INSERT INTO [dbo].[StaffUnitRole] (StaffId, UnitCode, Role, Department, IsManager, GroupKey, SortOrder)
    SELECT s.Id, N'ER', v.Role, v.Department, v.IsManager, v.GroupKey, v.SortOrder
    FROM (VALUES
        (N'ERN1', N'護理長',     N'ER 護理科', 1, N'leader',     10),
        (N'ERN2', N'護理師',     NULL,         0, N'nurse',      20),
        (N'ERN3', N'護理師',     NULL,         0, N'nurse',      30),
        (N'ERN4', N'護理師',     NULL,         0, N'nurse',      40),
        (N'ERS1', N'專科護理師', N'急診重症',  0, N'specialist', 50),
        (N'ERD1', N'主治醫師',   N'急診醫學',  0, N'attending',  60),
        (N'ERR1', N'住院醫師',   N'急診醫學',  0, N'resident',   70)
    ) v(EmpNo, Role, Department, IsManager, GroupKey, SortOrder)
    JOIN [dbo].[Staff] s ON s.EmployeeNo = v.EmpNo;
END
GO

/* ── 今日排班（ICU / OR / ER）── */
DECLARE @d DATE = CONVERT(date, GETDATE());

IF NOT EXISTS (SELECT 1 FROM [dbo].[StaffSchedule] WHERE UnitCode = N'ICU' AND WorkDate = @d)
INSERT INTO [dbo].[StaffSchedule] (StaffId, UnitCode, WorkDate, Shift, EmergencyGroup, IsCharge, SortOrder)
SELECT s.Id, N'ICU', @d, v.Shift, v.EG, v.Charge, v.SortOrder
FROM (VALUES
    (N'IN01', N'白班', N'指揮', 1, 10),(N'IN02', N'白班', N'A', 0, 20),(N'IN03', N'白班', N'B', 0, 30),
    (N'IS01', N'白班', NULL, 0, 40),(N'ID01', N'白班', NULL, 0, 50),(N'IR01', N'白班', NULL, 0, 60),
    (N'IN04', N'小夜', NULL, 1, 70),(N'IN05', N'大夜', NULL, 1, 80)
) v(EmpNo, Shift, EG, Charge, SortOrder)
JOIN [dbo].[Staff] s ON s.EmployeeNo = v.EmpNo;

IF NOT EXISTS (SELECT 1 FROM [dbo].[StaffSchedule] WHERE UnitCode = N'OR' AND WorkDate = @d)
INSERT INTO [dbo].[StaffSchedule] (StaffId, UnitCode, WorkDate, Shift, EmergencyGroup, IsCharge, SortOrder)
SELECT s.Id, N'OR', @d, v.Shift, v.EG, v.Charge, v.SortOrder
FROM (VALUES
    (N'ON01', N'白班', N'指揮', 1, 10),(N'ON02', N'白班', NULL, 0, 20),
    (N'ON03', N'白班', NULL, 0, 30),(N'OA01', N'白班', NULL, 0, 40),(N'OD01', N'白班', NULL, 0, 50)
) v(EmpNo, Shift, EG, Charge, SortOrder)
JOIN [dbo].[Staff] s ON s.EmployeeNo = v.EmpNo;

IF NOT EXISTS (SELECT 1 FROM [dbo].[StaffSchedule] WHERE UnitCode = N'ER' AND WorkDate = @d)
INSERT INTO [dbo].[StaffSchedule] (StaffId, UnitCode, WorkDate, Shift, EmergencyGroup, IsCharge, SortOrder)
SELECT s.Id, N'ER', @d, v.Shift, v.EG, v.Charge, v.SortOrder
FROM (VALUES
    (N'ERN1', N'白班', N'指揮', 1, 10),(N'ERN2', N'白班', N'A', 0, 20),(N'ERN3', N'白班', N'B', 0, 30),
    (N'ERS1', N'白班', NULL, 0, 40),(N'ERD1', N'白班', NULL, 0, 50),(N'ERR1', N'白班', NULL, 0, 60),
    (N'ERN4', N'小夜', NULL, 1, 70)
) v(EmpNo, Shift, EG, Charge, SortOrder)
JOIN [dbo].[Staff] s ON s.EmployeeNo = v.EmpNo;
GO

/* ── ICU 主護勾床示範（今日白班，F4-01~F4-04）── */
DECLARE @d2 DATE = CONVERT(date, GETDATE());
IF NOT EXISTS (SELECT 1 FROM [dbo].[BedStaffAssignment] WHERE UnitCode = N'ICU' AND WorkDate = @d2)
INSERT INTO [dbo].[BedStaffAssignment] (UnitCode, BedId, WorkDate, Shift, StaffId, AssignType, SortOrder)
SELECT N'ICU', v.BedId, @d2, N'白班', s.Id, N'主護', v.SortOrder
FROM (VALUES
    (N'F4-01', N'IN02', 10),(N'F4-02', N'IN02', 11),
    (N'F4-03', N'IN03', 20),(N'F4-06', N'IN03', 21),(N'F4-07', N'IN03', 22)
) v(BedId, EmpNo, SortOrder)
JOIN [dbo].[Staff] s ON s.EmployeeNo = v.EmpNo;
GO

PRINT N'[人員管理 v15] 已補 ICU / OR / ER 人員、單位角色、今日排班；ICU 主護勾床示範。';
GO
