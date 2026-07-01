/* ════════════════════════════════════════════════════════════════════
   schema_v20_w52_staff_demo.sql
   W52 護理人員示範資料（尚未取得實際名冊前的暫用資料）
   讓「排班資訊 / 醫師資訊 / 護理交班 / 照護團隊」四個頁籤不再空白。

   · 照護團隊 取自 StaffUnitRole（與日期無關）
   · 排班/醫師/交班 皆以「當日」查詢 → 種子涵蓋 今天 ~ 今天+30 天，避免隔日又空
   · 可重複執行：先清除 W52 相關資料再植入（只影響 W52）
   ════════════════════════════════════════════════════════════════════ */
SET NOCOUNT ON;

DECLARE @start DATE = CONVERT(date, GETDATE());
DECLARE @end   DATE = DATEADD(day, 30, @start);

/* ── 1) W52 護理團隊名冊（缺則新增；EmployeeNo 為鍵）────────────────── */
DECLARE @W52 TABLE (EmpNo NVARCHAR(20), Name NVARCHAR(50), Ext NVARCHAR(20),
                    Role NVARCHAR(30), Dept NVARCHAR(50), GroupKey NVARCHAR(20), IsMgr BIT, Sort INT);
INSERT INTO @W52 (EmpNo, Name, Ext, Role, Dept, GroupKey, IsMgr, Sort) VALUES
 (N'W52HN', N'周○玲', N'5210', N'護理長',     N'W52 護理科', N'leader',     1, 10),
 (N'W52N1', N'陳○梅', N'5201', N'護理師',     NULL,          N'nurse',      0, 20),
 (N'W52N2', N'蔡○柔', N'5202', N'護理師',     NULL,          N'nurse',      0, 30),
 (N'W52N3', N'鄭○雲', N'5203', N'護理師',     NULL,          N'nurse',      0, 40),
 (N'W52N4', N'林○靜', N'5204', N'護理師',     NULL,          N'nurse',      0, 50),
 (N'W52N5', N'黃○婷', N'5205', N'護理師',     NULL,          N'nurse',      0, 60),
 (N'W52N6', N'吳○潔', N'5206', N'護理師',     NULL,          N'nurse',      0, 70),
 (N'W52S1', N'李○玲', N'5220', N'專科護理師', N'傷口造口',   N'specialist', 0, 80),
 (N'W52D1', N'張○明', N'5301', N'主治醫師',   N'一般外科',   N'attending',  0, 90),
 (N'W52D2', N'王○強', N'5302', N'主治醫師',   N'骨科',       N'attending',  0, 100),
 (N'W52R1', N'吳○昇', N'5300', N'住院醫師',   N'一般外科',   N'resident',   0, 110),
 (N'W52A1', N'許○嬌', N'5230', N'照服員',     NULL,          N'allied',     0, 120);

INSERT INTO [dbo].[Staff] (EmployeeNo, Name, Ext, IsAdmin, SortOrder)
SELECT w.EmpNo, w.Name, w.Ext, 0, w.Sort
FROM @W52 w
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[Staff] s WHERE s.EmployeeNo = w.EmpNo);

/* ── 2) W52 單位角色（照護團隊）：清 W52 再植入 ─────────────────────── */
DELETE FROM [dbo].[StaffUnitRole] WHERE UnitCode = N'W52';
INSERT INTO [dbo].[StaffUnitRole] (StaffId, UnitCode, Role, Department, IsManager, GroupKey, SortOrder)
SELECT s.Id, N'W52', w.Role, w.Dept, w.IsMgr, w.GroupKey, w.Sort
FROM @W52 w JOIN [dbo].[Staff] s ON s.EmployeeNo = w.EmpNo;

/* ── 人員 Id 變數 ─────────────────────────────────────────────────── */
DECLARE @HN INT=(SELECT Id FROM Staff WHERE EmployeeNo=N'W52HN'),
        @N1 INT=(SELECT Id FROM Staff WHERE EmployeeNo=N'W52N1'),
        @N2 INT=(SELECT Id FROM Staff WHERE EmployeeNo=N'W52N2'),
        @N3 INT=(SELECT Id FROM Staff WHERE EmployeeNo=N'W52N3'),
        @N4 INT=(SELECT Id FROM Staff WHERE EmployeeNo=N'W52N4'),
        @N5 INT=(SELECT Id FROM Staff WHERE EmployeeNo=N'W52N5'),
        @N6 INT=(SELECT Id FROM Staff WHERE EmployeeNo=N'W52N6'),
        @S1 INT=(SELECT Id FROM Staff WHERE EmployeeNo=N'W52S1'),
        @D1 INT=(SELECT Id FROM Staff WHERE EmployeeNo=N'W52D1'),
        @D2 INT=(SELECT Id FROM Staff WHERE EmployeeNo=N'W52D2'),
        @R1 INT=(SELECT Id FROM Staff WHERE EmployeeNo=N'W52R1');

/* ── 3) 清除 W52 日期資料（今天~今天+30；含交班子表）───────────────── */
DELETE hi FROM [dbo].[HandoverItem] hi
  JOIN [dbo].[HandoverPatient] hp ON hp.Id = hi.HandoverPatientId
  JOIN [dbo].[HandoverShift]   hs ON hs.Id = hp.HandoverShiftId
 WHERE hs.UnitCode = N'W52' AND hs.WorkDate BETWEEN @start AND @end;
DELETE hp FROM [dbo].[HandoverPatient] hp
  JOIN [dbo].[HandoverShift] hs ON hs.Id = hp.HandoverShiftId
 WHERE hs.UnitCode = N'W52' AND hs.WorkDate BETWEEN @start AND @end;
DELETE FROM [dbo].[HandoverShift]      WHERE UnitCode=N'W52' AND WorkDate  BETWEEN @start AND @end;
DELETE FROM [dbo].[StaffSchedule]      WHERE UnitCode=N'W52' AND WorkDate  BETWEEN @start AND @end;
DELETE FROM [dbo].[BedStaffAssignment] WHERE UnitCode=N'W52' AND WorkDate  BETWEEN @start AND @end;
DELETE FROM [dbo].[DoctorRound]        WHERE UnitCode=N'W52' AND RoundDate BETWEEN @start AND @end;

/* ── 4) 逐日植入 排班/床位指派/查房/交班 ──────────────────────────── */
DECLARE @d DATE = @start, @hsid INT, @p1 INT, @p2 INT;
WHILE @d <= @end
BEGIN
    /* 排班（白/小夜/大夜；護理師＋專師＋住院醫師）*/
    INSERT INTO [dbo].[StaffSchedule] (StaffId, UnitCode, WorkDate, Shift, EmergencyGroup, IsCharge, SortOrder) VALUES
    (@HN, N'W52', @d, N'白班', N'指揮', 1, 10),
    (@N1, N'W52', @d, N'白班', N'A',    0, 20),
    (@N2, N'W52', @d, N'白班', N'B',    0, 30),
    (@N3, N'W52', @d, N'白班', NULL,    0, 40),
    (@S1, N'W52', @d, N'白班', NULL,    0, 50),
    (@R1, N'W52', @d, N'白班', NULL,    0, 60),
    (@N4, N'W52', @d, N'小夜', NULL,    1, 70),
    (@N5, N'W52', @d, N'小夜', NULL,    0, 80),
    (@N6, N'W52', @d, N'大夜', NULL,    1, 90);

    /* 床位指派：主護（白班）*/
    INSERT INTO [dbo].[BedStaffAssignment] (UnitCode, BedId, WorkDate, Shift, StaffId, AssignType, SortOrder) VALUES
    (N'W52',N'001',@d,N'白班',@N1,N'主護',10),(N'W52',N'002',@d,N'白班',@N1,N'主護',11),
    (N'W52',N'003',@d,N'白班',@N1,N'主護',12),(N'W52',N'004',@d,N'白班',@N1,N'主護',13),
    (N'W52',N'005',@d,N'白班',@N1,N'主護',14),
    (N'W52',N'006',@d,N'白班',@N2,N'主護',20),(N'W52',N'007',@d,N'白班',@N2,N'主護',21),
    (N'W52',N'008',@d,N'白班',@N2,N'主護',22),(N'W52',N'009',@d,N'白班',@N2,N'主護',23),
    (N'W52',N'010',@d,N'白班',@N2,N'主護',24),
    (N'W52',N'011',@d,N'白班',@N3,N'主護',30),(N'W52',N'012',@d,N'白班',@N3,N'主護',31),
    (N'W52',N'013',@d,N'白班',@N3,N'主護',32),(N'W52',N'014',@d,N'白班',@N3,N'主護',33),
    (N'W52',N'015',@d,N'白班',@N3,N'主護',34);

    /* 床位指派：主治（Shift 空）*/
    INSERT INTO [dbo].[BedStaffAssignment] (UnitCode, BedId, WorkDate, Shift, StaffId, AssignType, SortOrder) VALUES
    (N'W52',N'001',@d,NULL,@D1,N'主治',40),(N'W52',N'002',@d,NULL,@D1,N'主治',41),
    (N'W52',N'003',@d,NULL,@D1,N'主治',42),(N'W52',N'004',@d,NULL,@D1,N'主治',43),
    (N'W52',N'005',@d,NULL,@D1,N'主治',44),(N'W52',N'006',@d,NULL,@D1,N'主治',45),
    (N'W52',N'007',@d,NULL,@D1,N'主治',46),(N'W52',N'008',@d,NULL,@D1,N'主治',47),
    (N'W52',N'009',@d,NULL,@D2,N'主治',50),(N'W52',N'010',@d,NULL,@D2,N'主治',51),
    (N'W52',N'011',@d,NULL,@D2,N'主治',52),(N'W52',N'012',@d,NULL,@D2,N'主治',53),
    (N'W52',N'013',@d,NULL,@D2,N'主治',54),(N'W52',N'014',@d,NULL,@D2,N'主治',55),
    (N'W52',N'015',@d,NULL,@D2,N'主治',56);

    /* 查房表 */
    INSERT INTO [dbo].[DoctorRound] (UnitCode, RoundDate, StaffId, DoctorName, Specialty, EstimatedTime, ActualTime, IsCompleted, Remark, SortOrder) VALUES
    (N'W52',@d,@D1,N'張○明 醫師',N'一般外科',N'09:00',N'09:12',1,N'晨會後查房',10),
    (N'W52',@d,@D2,N'王○強 醫師',N'骨科',    N'14:00',NULL,   0,N'下午門診後', 20);

    /* 護理交班（白班→小夜）*/
    INSERT INTO [dbo].[HandoverShift] (UnitCode, WorkDate, FromShift, FromShiftTime, ToShift, ToShiftTime, HandoverTime, FromStaffIds, ToStaffIds)
    VALUES (N'W52', @d, N'白班', N'08:00–16:00', N'小夜', N'16:00–24:00', N'16:00',
            CONCAT(@N1, N',', @N2), CONCAT(@N4, N',', @N5));
    SET @hsid = SCOPE_IDENTITY();

    INSERT INTO [dbo].[HandoverPatient] (HandoverShiftId, BedNo, PatientName, Gender, Age, Diagnosis, Priority, SortOrder) VALUES
    (@hsid, N'001', N'林○志', N'M', 75, N'股骨頸骨折 — THA 術後 D2',        N'高', 10),
    (@hsid, N'006', N'王○豪', N'M', 58, N'MRSA 傷口感染 — 接觸隔離中',       N'高', 20);
    SET @p1 = (SELECT Id FROM [dbo].[HandoverPatient] WHERE HandoverShiftId=@hsid AND BedNo=N'001');
    SET @p2 = (SELECT Id FROM [dbo].[HandoverPatient] WHERE HandoverShiftId=@hsid AND BedNo=N'006');

    INSERT INTO [dbo].[HandoverItem] (HandoverPatientId, Category, Content, SortOrder) VALUES
    (@p1, N'管路', N'尿管 D2、CVP D3，注意引流量與顏色',        10),
    (@p1, N'用藥', N'Morphine 5mg PRN q4h，疼痛評估後給藥',     20),
    (@p1, N'警示', N'跌倒高風險、夜間譫妄，加強巡視',           30),
    (@p2, N'感控', N'MRSA 接觸隔離：穿戴手套隔離衣，訪客登記',  10),
    (@p2, N'待辦', N'明日 08:00 傷口培養追蹤回報',              20);

    SET @d = DATEADD(day, 1, @d);
END

PRINT N'[W52 人員示範 v20] 團隊 12 人 + 排班/床位/查房/交班（今天~+30 天）植入完成。';
GO
