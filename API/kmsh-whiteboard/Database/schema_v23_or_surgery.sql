/* =============================================================================
   KMSH OR 清洗手術清單 [dbo].[OrSurgery]（v23）
   -----------------------------------------------------------------------------
   由獨立工具 WhiteboardSync 從資訊室同步庫 DB2_DUMP 的 [OR].OPORDER_4A0
   （＋AM.HPBASIC_4A0 姓名/生日、AM.HLOC_4A0 病房床）清洗後落地到本地。
   白板/報表可直接讀此表（快、穩、資料已清乾淨），不必即時遠端 join。
   一列＝一台刀；含過去已完成刀（Board_OR API 拿不到）。可重複執行。
   欄位對應院方 OR 20 欄位需求；代碼表待資訊室確認者先存原碼（StatusCode）。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[OrSurgery]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OrSurgery] (
        [Id]             INT IDENTITY(1,1) NOT NULL,
        [OpDate]         DATE          NOT NULL,            -- 手術日期 ORBGNDT
        [OpTime]         NVARCHAR(10)  NOT NULL CONSTRAINT DF_OrSurg_OpTime DEFAULT(''),  -- 預計開始 HH:mm ORBGNTM
        [Room]           NVARCHAR(10)  NULL,                -- 手術室 OROPROOM（R1~R7/WD）
        [RoomId]         NVARCHAR(20)  NULL,                -- 對應白板房號 OR-xx（join OrRoom）
        [CaseType]       NVARCHAR(2)   NULL,                -- 住/門/急 ORCASETP（A/O/E）
        [CaseTypeText]   NVARCHAR(10)  NULL,                -- 住院/門診/急診
        [ChartNo]        NVARCHAR(20)  NOT NULL,            -- 病歷號 ORHISNUM
        [CaseNo]         NVARCHAR(20)  NULL,                -- 案號 ORCASENO
        [PatientName]    NVARCHAR(50)  NULL,                -- 姓名 HNAMEC
        [Sex]            NVARCHAR(2)   NULL,                -- 性別 HSEX
        [Age]            INT           NULL,                -- 年齡（生日 vs 手術日）
        [SourceWard]     NVARCHAR(20)  NULL,                -- 來源病房 HNURSTA
        [SourceBed]      NVARCHAR(20)  NULL,                -- 床 HBED
        [SurgeonNo]      NVARCHAR(20)  NULL,                -- 主刀員編 ORDOCNO
        [SurgeonName]    NVARCHAR(50)  NULL,                -- 主刀 ORDOCNM
        [MentorName]     NVARCHAR(50)  NULL,                -- 指導醫師 ORGUINM
        [AssistantNames] NVARCHAR(500) NULL,                -- 助手醫師（ORADRNM1~5 合併）
        [SurgeryName]    NVARCHAR(200) NULL,                -- 手術名稱 OROPNM1
        [Anesthesia]     NVARCHAR(20)  NULL,                -- 麻醉 OROPAMED（LA/SA/GA/IG/IR）
        [Department]     NVARCHAR(50)  NULL,                -- 科別 OROPORDER.ORCATGY（如 PS）
        [Diagnosis]      NVARCHAR(200) NULL,                -- 手術診斷文字 OPORDER.ORDIAG
        [NhiCodes]       NVARCHAR(200) NULL,                -- 健保手術代碼（OROPNC1~4 合併）
        [IcdCodes]       NVARCHAR(200) NULL,                -- 術前診斷 ICD（OROPICD1~4 合併）
        [StatusCode]     NVARCHAR(10)  NULL,                -- 手術狀態碼 ORSTATUS（代碼表待院方）
        [CancelReason]   NVARCHAR(400) NULL,                -- 取消/DC 原因 ORREASON
        [EndDate]        DATE          NULL,                -- 結束日期 ORENDDT（哨兵日已轉 NULL）
        [EndTime]        NVARCHAR(10)  NULL,                -- 結束時間 ORENDTM HH:mm
        [IsActive]       BIT NOT NULL CONSTRAINT DF_OrSurg_Active  DEFAULT(1),
        [UpdatedAt]      DATETIME2(0) NOT NULL CONSTRAINT DF_OrSurg_Updated DEFAULT(GETDATE()),
        [CreatedAt]      DATETIME2(0) NOT NULL CONSTRAINT DF_OrSurg_Created DEFAULT(GETDATE()),
        CONSTRAINT [PK_OrSurgery] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_OrSurgery] UNIQUE ([OpDate],[Room],[ChartNo],[OpTime])
    );
    CREATE INDEX [IX_OrSurgery_Date_Room] ON [dbo].[OrSurgery] ([OpDate],[Room]);
END
GO

-- 既有資料庫補欄：科別（OPORDER.ORCATGY）、診斷（OPORDER.ORDIAG）。可重複執行。
IF COL_LENGTH(N'[dbo].[OrSurgery]', N'Department') IS NULL
    ALTER TABLE [dbo].[OrSurgery] ADD [Department] NVARCHAR(50) NULL;
IF COL_LENGTH(N'[dbo].[OrSurgery]', N'Diagnosis') IS NULL
    ALTER TABLE [dbo].[OrSurgery] ADD [Diagnosis] NVARCHAR(200) NULL;
GO

PRINT N'[dbo].[OrSurgery] 清洗手術清單表建立完成（含科別、診斷）。';
GO
