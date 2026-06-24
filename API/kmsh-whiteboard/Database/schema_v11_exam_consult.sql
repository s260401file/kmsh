/* =============================================================================
   KMSH 檢查/會診 自建表 [dbo].[WardExamConsult]（v11，W52/ICU/ER 共用）
   -----------------------------------------------------------------------------
   院方 OR.ORDER/RESULT 未開放 → 先自建。檢查/會診共表（Kind 區分），後台可增刪改。
   種子照搬三站現有前端 examData（畫面不變）。可重複執行（OBJECT_ID＋IF NOT EXISTS）。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[WardExamConsult]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[WardExamConsult] (
        [Id]            INT IDENTITY(1,1) NOT NULL,
        [UnitCode]      NVARCHAR(20)  NOT NULL,            -- W52/ICU/ER
        [Kind]          NVARCHAR(10)  NOT NULL,            -- 檢查 / 會診
        [Hhisnum]       NVARCHAR(20)  NULL,                -- 病歷號（選填）
        [BedId]         NVARCHAR(20)  NULL,                -- 床號
        [PatientName]   NVARCHAR(50)  NULL,
        [Gender]        NVARCHAR(2)   NULL,
        [ItemName]      NVARCHAR(100) NULL,                -- 檢查項目 或 會診科別
        [Doctor]        NVARCHAR(50)  NULL,                -- 會診醫師（檢查留空）
        [ScheduledDate] NVARCHAR(20)  NULL,                -- 預定日期
        [TimeSlot]      NVARCHAR(30)  NULL,                -- 時段（如「上午 09:00」）
        [CompletedTime] NVARCHAR(30)  NULL,                -- 會診完成時間
        [Status]        NVARCHAR(20)  NULL,                -- 待執行/執行中/已完成/待回覆/已回覆…
        [Notes]         NVARCHAR(200) NULL,
        [SortOrder]     INT NOT NULL CONSTRAINT DF_WEC_Sort     DEFAULT(0),
        [IsActive]      BIT NOT NULL CONSTRAINT DF_WEC_IsActive DEFAULT(1),
        [UpdatedAt]     DATETIME2(0) NOT NULL CONSTRAINT DF_WEC_Updated DEFAULT(GETDATE()),
        [CreatedAt]     DATETIME2(0) NOT NULL CONSTRAINT DF_WEC_Created DEFAULT(GETDATE()),
        CONSTRAINT [PK_WardExamConsult] PRIMARY KEY CLUSTERED ([Id])
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[WardExamConsult])
BEGIN
    INSERT INTO [dbo].[WardExamConsult]
      (UnitCode,Kind,BedId,PatientName,Gender,ItemName,Doctor,ScheduledDate,TimeSlot,CompletedTime,Status,Notes,SortOrder) VALUES
    -- ── ER 檢查 ──
    ('ER',N'檢查',N'ER-01',N'王○明',NULL,N'胸部 X 光',         NULL,N'2026-06-03',N'09:00',NULL,N'完成',  N'',10),
    ('ER',N'檢查',N'ER-02',N'李○花',NULL,N'腹部超音波',        NULL,N'2026-06-03',N'10:30',NULL,N'執行中',N'NPO 中',20),
    ('ER',N'檢查',N'ER-03',N'張○強',NULL,N'頭部 CT',          NULL,N'2026-06-03',N'11:00',NULL,N'完成',  N'顯影劑過敏確認',30),
    ('ER',N'檢查',N'ER-05',N'陳○美',NULL,N'心電圖',            NULL,N'2026-06-03',N'11:30',NULL,N'待執行',N'',40),
    ('ER',N'檢查',N'ER-07',N'林○宏',NULL,N'腹部 CT（顯影）',   NULL,N'2026-06-03',N'13:00',NULL,N'待執行',N'腎功能確認中',50),
    ('ER',N'檢查',N'ER-09',N'黃○珊',NULL,N'骨盆 X 光',        NULL,N'2026-06-03',N'14:00',NULL,N'待執行',N'',60),
    ('ER',N'檢查',N'ER-11',N'吳○志',NULL,N'血液培養',          NULL,N'2026-06-03',N'08:30',NULL,N'完成',  N'送檢驗科',70),
    -- ── ER 會診 ──
    ('ER',N'會診',N'ER-02',N'李○花',NULL,N'婦產科',  N'張○惠醫師',NULL,NULL,N'10:00',N'已回覆',N'建議婦科超音波',110),
    ('ER',N'會診',N'ER-03',N'張○強',NULL,N'神經外科',N'陳○明醫師',NULL,NULL,N'11:15',N'已回覆',N'追蹤 CT 結果後決定手術',120),
    ('ER',N'會診',N'ER-05',N'陳○美',NULL,N'心臟內科',N'林○哲醫師',NULL,NULL,NULL,    N'待回覆',N'疑似 STEMI，請急會',130),
    ('ER',N'會診',N'ER-07',N'林○宏',NULL,N'一般外科',N'吳○誠醫師',NULL,NULL,NULL,    N'待回覆',N'急性腹症評估',140),
    ('ER',N'會診',N'ER-10',N'蔡○婷',NULL,N'精神科',  N'黃○安醫師',NULL,NULL,N'09:45',N'已回覆',N'需轉介精神科病房',150),
    ('ER',N'會診',N'ER-12',N'周○豪',NULL,N'骨科',    N'王○勇醫師',NULL,NULL,NULL,    N'待回覆',N'右股骨骨折手術評估',160),
    -- ── ICU 檢查 ──
    ('ICU',N'檢查',N'F4-01',N'林○志',N'M',N'Chest CT w/ contrast',NULL,N'2026-06-03',N'上午 09:00',NULL,N'待執行',N'肺炎評估',10),
    ('ICU',N'檢查',N'F4-02',N'張○芬',N'F',N'Echocardiogram',       NULL,N'2026-06-03',N'上午 10:30',NULL,N'已完成',N'心臟功能評估',20),
    ('ICU',N'檢查',N'F4-07',N'陳○祥',N'M',N'Wound culture (x3)',   NULL,N'2026-06-03',N'上午 07:00',NULL,N'已完成',N'細菌培養追蹤',30),
    ('ICU',N'檢查',N'F4-10',N'柯○芳',N'F',N'Brain MRI',           NULL,N'2026-06-03',N'下午 14:00',NULL,N'待執行',N'術後評估',40),
    ('ICU',N'檢查',N'F3-01',N'謝○恆',N'M',N'Sputum culture',      NULL,N'2026-06-03',N'上午 06:00',NULL,N'已完成',N'肺炎病原追蹤',50),
    ('ICU',N'檢查',N'F4-12',N'彭○輝',N'M',N'Chest X-ray (portable)',NULL,N'2026-06-04',N'上午 07:00',NULL,N'預約',N'肺水腫追蹤',60),
    ('ICU',N'檢查',N'F4-15',N'王○任',N'M',N'Urine culture',       NULL,N'2026-06-03',N'上午 06:30',NULL,N'已完成',N'UTI治療評估',70),
    -- ── ICU 會診 ──
    ('ICU',N'會診',N'F4-01',N'林○志',N'M',N'感染科',  N'魏○欣 醫師',NULL,NULL,N'2026-06-03 08:30',N'已完成',N'抗生素方案調整建議',110),
    ('ICU',N'會診',N'F4-05',N'黃○雄',N'M',N'復健科',  N'陳○雅 醫師',NULL,NULL,N'2026-06-03 10:00',N'進行中',N'神經復健評估',120),
    ('ICU',N'會診',N'F4-11',N'羅○平',N'M',N'腸胃科',  N'黃○誠 主任',NULL,NULL,N'2026-06-03 07:45',N'已完成',N'消化道出血處置建議',130),
    ('ICU',N'會診',N'F4-12',N'彭○輝',N'M',N'心臟內科',N'弘○醫師',  NULL,NULL,N'2026-06-02 16:00',N'已完成',N'心衰竭治療調整',140),
    ('ICU',N'會診',N'F3-01',N'謝○恆',N'M',N'胸腔外科',N'蘇○醫師',  NULL,NULL,N'2026-06-03 14:30',N'待安排',N'胸腔引流評估',150),
    ('ICU',N'會診',N'F4-18',N'張○慧',N'F',N'肝膽腸胃科',N'李○醫師',NULL,NULL,N'2026-06-02 14:00',N'已完成',N'肝性腦病處理建議',160),
    -- ── W52 檢查 ──
    ('W52',N'檢查',N'019',N'賴○月',N'F',N'Echocardiogram',     NULL,N'2026-06-03',N'上午 08:00',NULL,N'待執行',N'術前評估',10),
    ('W52',N'檢查',N'016',N'張○河',N'M',N'Hip X-ray AP/Lat',   NULL,N'2026-06-03',N'上午 09:30',NULL,N'已完成',N'等放射科報告',20),
    ('W52',N'檢查',N'008',N'陳○珠',N'F',N'CBC + Coagulation',  NULL,N'2026-06-03',N'上午 06:30',NULL,N'已完成',N'送檢驗中',30),
    ('W52',N'檢查',N'027',N'朱○玉',N'F',N'CT Chest w/ contrast',NULL,N'2026-06-03',N'下午 14:00',NULL,N'待執行',N'化療前評估',40),
    ('W52',N'檢查',N'007',N'吳○美',N'F',N'Urodynamic study',   NULL,N'2026-06-04',N'上午 10:00',NULL,N'預約',N'',50),
    -- ── W52 會診 ──
    ('W52',N'會診',N'019',N'賴○月',N'F',N'心臟外科',  N'黃○誠 主任',NULL,NULL,N'2026-06-03 07:45',N'已完成',N'建議 MVR',110),
    ('W52',N'會診',N'038',N'梁○山',N'M',N'感染科',    N'魏○欣 醫師',NULL,NULL,N'2026-06-03 09:00',N'進行中',N'MRSA 治療調整',120),
    ('W52',N'會診',N'031',N'羅○凱',N'M',N'腎臟科',    N'陳○科 醫師',NULL,NULL,N'2026-06-02 23:55',N'已完成',N'建議啟動 CRRT',130),
    ('W52',N'會診',N'013',N'周○玲',N'F',N'新陳代謝',  N'李○醫師',  NULL,NULL,N'2026-06-02 14:00',N'已完成',N'出院後門診追蹤',140),
    ('W52',N'會診',N'007',N'吳○美',N'F',N'復健科',    N'陳○雅 醫師',NULL,NULL,N'2026-06-03 14:30',N'待安排',N'壓瘡照護評估',150);
END
GO

PRINT N'[dbo].[WardExamConsult] 建立並植入 W52/ICU/ER 檢查/會診種子。';
GO
