/* =============================================================================
   KMSH 護理電子白板 — 自建後台 DB 初版 Schema (v1)
   -----------------------------------------------------------------------------
   資料庫：SQL Server Express，DB 名 [Whiteboard]（見 Document/sqlexpress.txt）
   背景：高榮 HIS 正式機未開放、護理紀錄/評估系統未開放、備份庫停更；
         程式中 VghksApiService / AmdrCase.patflag 的 dnr/fall/iso/npo/主責護理師/
         會診 等欄位皆為「對接高榮規格的預留殼」，民生大部份無實際資料。
         → 9 月驗收前以「自建後台 + 來源策略(SourceMode)逐項切換」為主。

   命名原則（本版重點）：
     - 凡有院方(HIS AMDR/HIS 字典)對應的欄位，**直接採用院方欄位名**（如
       Hnamec/Hbed/Hnursta/Hhisnum/Etrank…），日後切回 API/HIS 對齊零摩擦。
     - 純自建、院方無對應者，採描述性 PascalCase（沿用既有 DutyContact 風格）。
   慣例欄位：Id INT IDENTITY 主鍵、UnitCode 分單位、IsActive 上下架、
            SortOrder 排序、CreatedAt GETDATE()；Dapper + raw SQL；硬刪除。
   memo：每欄以 sp_addextendedproperty 加 MS_Description（SSMS「描述」可見、可查詢），
        放在各建表 IF NOT EXISTS 區塊內 → 本檔可重複執行不報錯。
   ============================================================================= */

SET NOCOUNT ON;
GO

/* ───────────────────────────────────────────────────────────────────────────
   1. PatientCensus — 自建病人/床位主檔（所有註記掛載的錨點）
      欄位名對齊 HIS AMDR（getERPat/getAMPat / 字典 AM.*）；一床一活躍列。
   ─────────────────────────────────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[PatientCensus]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PatientCensus] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [UnitCode]  NVARCHAR(20)  NOT NULL,
        [Hbed]      NVARCHAR(20)  NOT NULL,
        [Hnursta]   NVARCHAR(20)  NULL,
        [Hhisnum]   NVARCHAR(20)  NULL,
        [Hcaseno]   NVARCHAR(20)  NULL,
        [Hnamec]    NVARCHAR(50)  NOT NULL,
        [Hsex]      NVARCHAR(4)   NULL,
        [Hbirthdt]  DATE          NULL,
        [Hidno]     NVARCHAR(20)  NULL,
        [Hcursvcl]  NVARCHAR(20)  NULL,
        [Hcurdesc]  NVARCHAR(50)  NULL,
        [Hdocnamc]  NVARCHAR(50)  NULL,
        [Hmdtype]   NVARCHAR(10)  NULL,
        [Hdiagtxt]  NVARCHAR(500) NULL,
        [Etrank]    NVARCHAR(4)   NULL,
        [Hadmdt]    DATETIME2(0)  NULL,
        [Hpatstat]  NVARCHAR(20)  NULL,
        [Source]    CHAR(6)       NOT NULL CONSTRAINT [DF_PatientCensus_Source]   DEFAULT('MANUAL'),
        [IsActive]  BIT           NOT NULL CONSTRAINT [DF_PatientCensus_IsActive] DEFAULT(1),
        [SortOrder] INT           NOT NULL CONSTRAINT [DF_PatientCensus_Sort]     DEFAULT(0),
        [UpdatedAt] DATETIME2(0)  NULL,
        [CreatedAt] DATETIME2(0)  NOT NULL CONSTRAINT [DF_PatientCensus_Created]  DEFAULT(GETDATE()),
        CONSTRAINT [PK_PatientCensus] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE UNIQUE INDEX [UX_PatientCensus_Bed_Active]
        ON [dbo].[PatientCensus] ([UnitCode],[Hbed]) WHERE [IsActive] = 1;
    CREATE INDEX [IX_PatientCensus_Hhisnum] ON [dbo].[PatientCensus] ([Hhisnum]);

    DECLARE @t SYSNAME = N'PatientCensus';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'自建病人/床位主檔；一床一活躍列，所有病人註記(PatientMarker)掛載的錨點。可人工建(Source=MANUAL)或由 Board_ER/HIS 帶入(Source=HIS)。', N'SCHEMA',N'dbo',N'TABLE',@t;
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主鍵流水號（自建）',                                              N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Id';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'所屬單位代碼 w52/icu/or/er（自建分單位用）',                      N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UnitCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'床號。院方對應 HIS AM.HLOC.HBED / API hbed,hbedno',               N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hbed';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'病房代碼。院方對應 HIS AM.HLOC.HNURSTA / API hnursta',            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hnursta';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'病歷號。院方對應 HIS 各表 HHISNUM / API hhisnum（人工列可空）',   N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hhisnum';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'就醫/住院案號。院方對應 API hcaseno',                            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hcaseno';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'病人中文姓名。院方對應 HIS AM.HPBASIC.HNAMEC / API hnamec',       N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hnamec';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'性別。院方對應 HIS AM.HPBASIC.HSEX / API hsex',                   N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hsex';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'出生日期。院方對應 HIS AM.HPBASIC.HBIRTHDT / API hbirthdt',       N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hbirthdt';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'身分證號。院方對應 HIS AM.HPBASIC.HIDNO（個資，白板不顯示）',     N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hidno';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'目前科別代碼。院方對應 HIS AM.HSECTION.HCURSVCL',                 N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hcursvcl';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'目前科別名稱。院方對應 API hcurdesc',                            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hcurdesc';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主治/負責醫師姓名。院方對應 HIS AM.HDOCTOR.HDOCNAMC / API vsName',N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hdocnamc';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'醫師類別（區分主治/專師）。院方對應 HIS AM.HDOCTOR.HMDTYPE',     N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hmdtype';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'診斷文字。院方對應 HIS AM.HDIAGNOS.HDIAGTXT',                     N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hdiagtxt';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'檢傷分級(ER)。院方對應 HIS ER.ETROOT.ETRANK / API hemgtype；白板顯示 A/B/C', N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Etrank';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'入院日期時間。院方對應 HIS AM.HCASE.HADMDT/HADMTM',               N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hadmdt';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'病人狀態(占床/待轉入出/待出院)。院方對應 HIS AM.HCASE.HPATSTAT / API hpatstat', N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hpatstat';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'資料來源：HIS=院方帶入、MANUAL=後台人工（自建欄位，供混合策略合併）',  N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Source';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'是否啟用/在床（自建，0=出院或停用）',                            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'IsActive';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'白板顯示排序（自建）',                                            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'SortOrder';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'最後異動時間（自建）',                                            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UpdatedAt';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'建立時間（自建，預設 GETDATE()）',                               N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CreatedAt';
END
GO

/* ───────────────────────────────────────────────────────────────────────────
   2. MarkerTypeDef — 病人註記類型定義 ＋ 來源策略(SourceMode)（純自建，院方無對應）
   ─────────────────────────────────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[MarkerTypeDef]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MarkerTypeDef] (
        [Id]             INT IDENTITY(1,1) NOT NULL,
        [Code]           NVARCHAR(20)  NOT NULL,
        [Name]           NVARCHAR(50)  NOT NULL,
        [AppliesToUnits] NVARCHAR(100) NULL,
        [DisplayShape]   NVARCHAR(20)  NULL,
        [DisplayColor]   NVARCHAR(20)  NULL,
        [SourceMode]     VARCHAR(16)   NOT NULL CONSTRAINT [DF_MarkerTypeDef_SrcMode] DEFAULT('MANUAL_ONLY'),
        [IsEnabled]      BIT           NOT NULL CONSTRAINT [DF_MarkerTypeDef_Enabled] DEFAULT(1),
        [SortOrder]      INT           NOT NULL CONSTRAINT [DF_MarkerTypeDef_Sort]    DEFAULT(0),
        [CreatedAt]      DATETIME2(0)  NOT NULL CONSTRAINT [DF_MarkerTypeDef_Created] DEFAULT(GETDATE()),
        CONSTRAINT [PK_MarkerTypeDef] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_MarkerTypeDef_Code] UNIQUE ([Code]),
        CONSTRAINT [CK_MarkerTypeDef_SrcMode] CHECK
            ([SourceMode] IN ('MANUAL_ONLY','HIS_ONLY','HIS_THEN_MANUAL','MANUAL_THEN_HIS'))
    );

    DECLARE @t SYSNAME = N'MarkerTypeDef';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'病人註記類型定義表，並承載「來源策略」混合機制；亦兼作註記顯示開關。純自建，院方無對應。', N'SCHEMA',N'dbo',N'TABLE',@t;
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主鍵流水號',                                                                          N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Id';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'註記代碼：DNR/FALL/ISO/NPO/CHEMO/PLOT/LINE/TRANSPORT/RESTRAINT/O2/NO_TX/RRT/STRATEGIC', N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Code';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'註記顯示名稱（中文）',                                                                  N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Name';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'適用單位（逗號分隔；NULL=全部）',                                                       N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'AppliesToUnits';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'白板圖示形狀，對應 React utils/flagShapes（circle/triangle/square…）',                  N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DisplayShape';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'顯示顏色（如 A紅/B黃/C綠）',                                                            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DisplayColor';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'★來源策略：MANUAL_ONLY/HIS_ONLY/HIS_THEN_MANUAL/MANUAL_THEN_HIS；決定該註記顯示時 HIS 與人工如何取捨，HIS 逐項開放時改此格即切換。', N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'SourceMode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'是否啟用此註記（後台可開關，如 RRT 顯示與否）',                                          N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'IsEnabled';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'顯示排序',                                                                              N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'SortOrder';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'建立時間',                                                                              N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CreatedAt';
END
GO

/* 種子資料：依 Obsidian 現況預設 SourceMode（待院方逐項確認後微調）
   原則：HIS 字典/護理紀錄系統「日後可能開放」→ HIS_THEN_MANUAL（無 HIS 列即自動用人工，安全）；
         HIS 不會有、純自建 → MANUAL_ONLY。 */
MERGE [dbo].[MarkerTypeDef] AS d
USING (VALUES
    (N'DNR',       N'DNR',      N'HIS_THEN_MANUAL',  10),   -- HIS: HPBASIC.HDNRSIGN / HCASE.HDNRCASE
    (N'CHEMO',     N'化療',     N'HIS_THEN_MANUAL',  20),   -- HIS: UD.UDORDER.UDDCJUST
    (N'NPO',       N'禁食',     N'HIS_THEN_MANUAL',  30),   -- HIS: OR.OPORDER.ORNPODT（手術NPO）
    (N'ISO',       N'隔離',     N'HIS_THEN_MANUAL',  40),   -- 護理紀錄系統（未開放）→ 現以人工
    (N'FALL',      N'高危跌',   N'HIS_THEN_MANUAL',  50),   -- 護理評估（未開放）→ 現以人工
    (N'LINE',      N'管路',     N'HIS_THEN_MANUAL',  60),   -- 護理紀錄（未開放）；換管日用 ExpireDate ★ICU
    (N'PLOT',      N'測謀',     N'HIS_THEN_MANUAL',  70),   -- HIS: ER.ETROOTS.SCASE1~12（定義待確認）
    (N'TRANSPORT', N'運送等級', N'MANUAL_ONLY',      80),   -- 稱 HIS「第二頁」有，非 81 表 → 先自建
    (N'RESTRAINT', N'約束',     N'MANUAL_ONLY',      90),   -- 護理紀錄系統 0 筆 → 自建
    (N'O2',        N'氧氣設備', N'MANUAL_ONLY',     100),   -- 護理紀錄系統 0 筆 → 自建
    (N'NO_TX',     N'禁治療',   N'MANUAL_ONLY',     110),   -- 來源待確認 → 先自建
    (N'RRT',       N'RRT',      N'MANUAL_ONLY',     120),   -- 白板註記，後台可開關
    (N'STRATEGIC', N'策略病人', N'MANUAL_ONLY',     130)    -- 機構後送，HIS 無 → 自建
) AS s ([Code],[Name],[SourceMode],[SortOrder])
ON (d.[Code] = s.[Code])
WHEN NOT MATCHED THEN
    INSERT ([Code],[Name],[SourceMode],[SortOrder])
    VALUES (s.[Code], s.[Name], s.[SourceMode], s.[SortOrder]);
GO

/* ───────────────────────────────────────────────────────────────────────────
   3. PatientMarker — 病人註記（掛在 census 上；每列標 Source，顯示時依 SourceMode 合併）
   ─────────────────────────────────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[PatientMarker]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PatientMarker] (
        [Id]            INT IDENTITY(1,1) NOT NULL,
        [UnitCode]      NVARCHAR(20)  NOT NULL,
        [Hhisnum]       NVARCHAR(20)  NULL,
        [Hbed]          NVARCHAR(20)  NULL,
        [MarkerCode]    NVARCHAR(20)  NOT NULL,
        [MarkerValue]   NVARCHAR(50)  NULL,
        [DetailText]    NVARCHAR(200) NULL,
        [EffectiveDate] DATETIME2(0)  NULL,
        [ExpireDate]    DATETIME2(0)  NULL,
        [Source]        CHAR(6)       NOT NULL CONSTRAINT [DF_PatientMarker_Source]   DEFAULT('MANUAL'),
        [IsActive]      BIT           NOT NULL CONSTRAINT [DF_PatientMarker_IsActive] DEFAULT(1),
        [UpdatedBy]     NVARCHAR(20)  NULL,
        [CreatedAt]     DATETIME2(0)  NOT NULL CONSTRAINT [DF_PatientMarker_Created]  DEFAULT(GETDATE()),
        CONSTRAINT [PK_PatientMarker] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_PatientMarker_Type] FOREIGN KEY ([MarkerCode]) REFERENCES [dbo].[MarkerTypeDef]([Code])
    );
    CREATE INDEX [IX_PatientMarker_Hhisnum] ON [dbo].[PatientMarker] ([Hhisnum]) WHERE [IsActive] = 1;
    CREATE INDEX [IX_PatientMarker_Bed]     ON [dbo].[PatientMarker] ([UnitCode],[Hbed]) WHERE [IsActive] = 1;
    CREATE INDEX [IX_PatientMarker_Code]    ON [dbo].[PatientMarker] ([MarkerCode]);

    DECLARE @t SYSNAME = N'PatientMarker';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'病人註記資料；掛在 PatientCensus 上（以 Hhisnum 或 Hbed）。每列標 Source，白板顯示時依 MarkerTypeDef.SourceMode 在 HIS/人工列間取一。', N'SCHEMA',N'dbo',N'TABLE',@t;
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主鍵流水號',                                                            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Id';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'所屬單位代碼',                                                          N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UnitCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'病歷號（與 Hbed 擇一掛載）。院方對應 HIS HHISNUM',                      N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hhisnum';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'床號（人工列常用）。院方對應 HIS AM.HLOC.HBED',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hbed';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'註記代碼，→ MarkerTypeDef.Code',                                        N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'MarkerCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'註記值，例：TRANSPORT=A/B/C、LINE=NG/CVC/導尿',                          N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'MarkerValue';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'補充說明文字',                                                          N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DetailText';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'生效日期',                                                              N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'EffectiveDate';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'失效/換管日（管路 LINE 用）',                                           N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'ExpireDate';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'資料來源：HIS / MANUAL（供 SourceMode 合併）',                          N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Source';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'是否啟用',                                                              N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'IsActive';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'異動者員編',                                                            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UpdatedBy';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'建立時間',                                                              N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CreatedAt';
END
GO

/* ───────────────────────────────────────────────────────────────────────────
   4. UnitInfo — 站別 / 護理長 / 病房主任（純自建，每單位一列）
   ─────────────────────────────────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[UnitInfo]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[UnitInfo] (
        [Id]               INT IDENTITY(1,1) NOT NULL,
        [UnitCode]         NVARCHAR(20)  NOT NULL,
        [UnitName]         NVARCHAR(50)  NOT NULL,
        [HeadNurseName]    NVARCHAR(50)  NULL,
        [WardDirectorName] NVARCHAR(50)  NULL,
        [UpdatedAt]        DATETIME2(0)  NULL,
        [CreatedAt]        DATETIME2(0)  NOT NULL CONSTRAINT [DF_UnitInfo_Created] DEFAULT(GETDATE()),
        CONSTRAINT [PK_UnitInfo] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_UnitInfo_UnitCode] UNIQUE ([UnitCode])
    );

    DECLARE @t SYSNAME = N'UnitInfo';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'各單位白板頁首基本資訊（站別/護理長/病房主任）。純自建，HIS 無對應。', N'SCHEMA',N'dbo',N'TABLE',@t;
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主鍵流水號',                       N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Id';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'單位代碼（唯一）',                 N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UnitCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'單位名稱（顯示用）',               N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UnitName';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'護理長姓名',                       N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'HeadNurseName';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'病房主任姓名',                     N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'WardDirectorName';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'最後異動時間',                     N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UpdatedAt';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'建立時間',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CreatedAt';
END
GO

/* ───────────────────────────────────────────────────────────────────────────
   5. NurseStaff — 各站護理人員主檔（過渡，院方 KMUH tms/uas 未開放）
      員編/姓名 對齊 KMUH HRS 之 PE_NO/PE_NAME 概念。
   ─────────────────────────────────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[NurseStaff]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[NurseStaff] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [UnitCode]   NVARCHAR(20)  NOT NULL,
        [EmployeeNo] NVARCHAR(20)  NOT NULL,
        [Name]       NVARCHAR(50)  NOT NULL,
        [TitleLevel] NVARCHAR(20)  NULL,
        [Phone]      NVARCHAR(30)  NULL,
        [IsActive]   BIT           NOT NULL CONSTRAINT [DF_NurseStaff_IsActive] DEFAULT(1),
        [SortOrder]  INT           NOT NULL CONSTRAINT [DF_NurseStaff_Sort]     DEFAULT(0),
        [CreatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT [DF_NurseStaff_Created]  DEFAULT(GETDATE()),
        CONSTRAINT [PK_NurseStaff] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_NurseStaff_Unit_Emp] UNIQUE ([UnitCode],[EmployeeNo])
    );

    DECLARE @t SYSNAME = N'NurseStaff';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'各站護理人員主檔（後台自建，過渡 KMUH HRS/UAS 未開放）。供主護指派挑選人員。', N'SCHEMA',N'dbo',N'TABLE',@t;
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主鍵流水號',                                          N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Id';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'所屬單位代碼',                                        N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UnitCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'員工編號。院方對應 KMUH HRS PE_NO',                   N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'EmployeeNo';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'姓名。院方對應 KMUH HRS PE_NAME',                     N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Name';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'職稱/層級（N1~N4）',                                  N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'TitleLevel';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'聯絡電話/分機。院方對應 KMUH HRS EXT/MVPN',           N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Phone';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'是否在職/啟用',                                       N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'IsActive';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'顯示排序',                                            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'SortOrder';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'建立時間',                                            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CreatedAt';
END
GO

/* ───────────────────────────────────────────────────────────────────────────
   6. NurseBedAssignment — 主護指派（員編勾床；白板「床→護理師」直接查）純自建
   ─────────────────────────────────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[NurseBedAssignment]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[NurseBedAssignment] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [UnitCode]   NVARCHAR(20)  NOT NULL,
        [DutyDate]   DATE          NOT NULL,
        [ShiftType]  NVARCHAR(10)  NOT NULL,
        [Hbed]       NVARCHAR(20)  NOT NULL,
        [EmployeeNo] NVARCHAR(20)  NOT NULL,
        [TeamCode]   NVARCHAR(20)  NULL,
        [IsCharge]   BIT           NOT NULL CONSTRAINT [DF_NurseBedAssign_Charge]  DEFAULT(0),
        [CreatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT [DF_NurseBedAssign_Created] DEFAULT(GETDATE()),
        CONSTRAINT [PK_NurseBedAssignment] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_NurseBedAssign] UNIQUE ([UnitCode],[DutyDate],[ShiftType],[Hbed])
    );
    CREATE INDEX [IX_NurseBedAssign_Date] ON [dbo].[NurseBedAssignment] ([UnitCode],[DutyDate],[ShiftType]);

    DECLARE @t SYSNAME = N'NurseBedAssignment';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主護指派：護理師(員編)當日某班負責哪些床。白板以(單位,床號)直接查負責護理師。純自建（HIS 主護欄位未開放）。', N'SCHEMA',N'dbo',N'TABLE',@t;
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主鍵流水號',                                              N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Id';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'所屬單位代碼',                                            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UnitCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'值班日期',                                                N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DutyDate';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'班別（白班/小夜/大夜）',                                  N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'ShiftType';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'負責床號。院方對應 HIS AM.HLOC.HBED',                     N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hbed';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'護理師員編，→ NurseStaff.EmployeeNo',                     N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'EmployeeNo';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'緊急應變編組',                                            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'TeamCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'是否點班/負責人',                                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'IsCharge';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'建立時間',                                                N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CreatedAt';
END
GO

/* ───────────────────────────────────────────────────────────────────────────
   7. ShiftStaff — 三班醫護/值班清單（ER 既有 mock ShiftStaff 接此）純自建
   ─────────────────────────────────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[ShiftStaff]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ShiftStaff] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [UnitCode]   NVARCHAR(20)  NOT NULL,
        [DutyDate]   DATE          NOT NULL,
        [ShiftType]  NVARCHAR(10)  NOT NULL,
        [Role]       NVARCHAR(20)  NOT NULL,
        [Name]       NVARCHAR(50)  NOT NULL,
        [EmployeeNo] NVARCHAR(20)  NULL,
        [IsActive]   BIT           NOT NULL CONSTRAINT [DF_ShiftStaff_IsActive] DEFAULT(1),
        [SortOrder]  INT           NOT NULL CONSTRAINT [DF_ShiftStaff_Sort]     DEFAULT(0),
        [CreatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT [DF_ShiftStaff_Created]  DEFAULT(GETDATE()),
        CONSTRAINT [PK_ShiftStaff] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX [IX_ShiftStaff_Date] ON [dbo].[ShiftStaff] ([UnitCode],[DutyDate],[ShiftType]);

    DECLARE @t SYSNAME = N'ShiftStaff';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'三班醫護/值班清單；急診值班醫師(白/夜)、照服員、專師/住院醫師排班皆以 Role 收斂。純自建。', N'SCHEMA',N'dbo',N'TABLE',@t;
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主鍵流水號',                                  N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Id';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'所屬單位代碼',                                N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UnitCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'值班日期',                                    N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DutyDate';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'班別（白/小夜/大夜；急診白/夜）',            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'ShiftType';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'角色：醫師/護理師/照服員/書記/專師/住院醫師', N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Role';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'姓名',                                        N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Name';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'員編（可空）',                                N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'EmployeeNo';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'是否啟用',                                    N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'IsActive';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'顯示排序',                                    N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'SortOrder';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'建立時間',                                    N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CreatedAt';
END
GO

/* ───────────────────────────────────────────────────────────────────────────
   8. DoctorDirectory — 會診醫師主檔（科別→醫師，供下拉）純自建
   ─────────────────────────────────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[DoctorDirectory]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DoctorDirectory] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [DeptCode]   NVARCHAR(20)  NULL,
        [DeptName]   NVARCHAR(50)  NOT NULL,
        [DoctorName] NVARCHAR(50)  NOT NULL,
        [EmployeeNo] NVARCHAR(20)  NULL,
        [IsActive]   BIT           NOT NULL CONSTRAINT [DF_DoctorDir_IsActive] DEFAULT(1),
        [SortOrder]  INT           NOT NULL CONSTRAINT [DF_DoctorDir_Sort]     DEFAULT(0),
        [CreatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT [DF_DoctorDir_Created]  DEFAULT(GETDATE()),
        CONSTRAINT [PK_DoctorDirectory] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX [IX_DoctorDir_Dept] ON [dbo].[DoctorDirectory] ([DeptCode]);

    DECLARE @t SYSNAME = N'DoctorDirectory';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'會診醫師主檔（科別→醫師），供後台會診值班下拉挑選。純自建。', N'SCHEMA',N'dbo',N'TABLE',@t;
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主鍵流水號',                                       N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Id';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'科別代碼。院方對應 HIS AM.HSECTION.HCURSVCL',       N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DeptCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'科別名稱',                                          N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DeptName';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'醫師姓名。院方對應 HIS AM.HDOCTOR.HDOCNAMC',        N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DoctorName';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'醫師員編/代號',                                     N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'EmployeeNo';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'是否啟用',                                          N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'IsActive';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'顯示排序',                                          N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'SortOrder';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'建立時間',                                          N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CreatedAt';
END
GO

/* ───────────────────────────────────────────────────────────────────────────
   9. ConsultDutyDaily — 會診醫師每日各科值班（免點病人即見當日值班）純自建
   ─────────────────────────────────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[ConsultDutyDaily]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ConsultDutyDaily] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [UnitCode]   NVARCHAR(20)  NOT NULL,
        [DutyDate]   DATE          NOT NULL,
        [DeptCode]   NVARCHAR(20)  NULL,
        [DoctorId]   INT           NULL,
        [DoctorName] NVARCHAR(50)  NULL,
        [ShiftType]  NVARCHAR(10)  NULL,
        [SortOrder]  INT           NOT NULL CONSTRAINT [DF_ConsultDuty_Sort]    DEFAULT(0),
        [CreatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT [DF_ConsultDuty_Created] DEFAULT(GETDATE()),
        CONSTRAINT [PK_ConsultDutyDaily] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX [IX_ConsultDuty_Date] ON [dbo].[ConsultDutyDaily] ([UnitCode],[DutyDate]);

    DECLARE @t SYSNAME = N'ConsultDutyDaily';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'會診醫師每日各科值班清單（ICU/ER）。純自建；HIS 會診值班名單未開放。', N'SCHEMA',N'dbo',N'TABLE',@t;
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主鍵流水號',                              N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Id';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'所屬單位代碼（icu/er）',                  N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UnitCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'值班日期',                                N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DutyDate';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'科別代碼',                                N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DeptCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'醫師 Id，→ DoctorDirectory.Id',          N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DoctorId';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'醫師姓名（冗餘存名，免 join 也可顯示）', N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DoctorName';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'班別',                                    N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'ShiftType';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'顯示排序',                                N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'SortOrder';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'建立時間',                                N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CreatedAt';
END
GO

/* ───────────────────────────────────────────────────────────────────────────
   10. DoctorRound — 醫師查房時間表（W52）純自建
   ─────────────────────────────────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[DoctorRound]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DoctorRound] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [UnitCode]   NVARCHAR(20)  NOT NULL,
        [Weekday]    TINYINT       NULL,
        [RoundDate]  DATE          NULL,
        [DoctorName] NVARCHAR(50)  NOT NULL,
        [TimeSlot]   NVARCHAR(30)  NULL,
        [Note]       NVARCHAR(100) NULL,
        [IsActive]   BIT           NOT NULL CONSTRAINT [DF_DoctorRound_IsActive] DEFAULT(1),
        [SortOrder]  INT           NOT NULL CONSTRAINT [DF_DoctorRound_Sort]     DEFAULT(0),
        [CreatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT [DF_DoctorRound_Created]  DEFAULT(GETDATE()),
        CONSTRAINT [PK_DoctorRound] PRIMARY KEY CLUSTERED ([Id])
    );

    DECLARE @t SYSNAME = N'DoctorRound';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'醫師查房時間表（W52）。純自建。', N'SCHEMA',N'dbo',N'TABLE',@t;
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主鍵流水號',                       N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Id';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'所屬單位代碼',                     N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UnitCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'星期(1~7)，與 RoundDate 擇一',     N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Weekday';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'指定日期，與 Weekday 擇一',        N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'RoundDate';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'醫師姓名',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DoctorName';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'查房時段',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'TimeSlot';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'備註',                             N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Note';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'是否啟用',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'IsActive';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'顯示排序',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'SortOrder';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'建立時間',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CreatedAt';
END
GO

/* ───────────────────────────────────────────────────────────────────────────
   11. Handover — 護理交班/日誌摘要（W52）純自建
   ─────────────────────────────────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[Handover]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Handover] (
        [Id]           INT IDENTITY(1,1) NOT NULL,
        [UnitCode]     NVARCHAR(20)   NOT NULL,
        [HandoverDate] DATE           NOT NULL,
        [ShiftType]    NVARCHAR(10)   NULL,
        [Content]      NVARCHAR(MAX)  NULL,
        [AuthorEmpNo]  NVARCHAR(20)   NULL,
        [IsActive]     BIT            NOT NULL CONSTRAINT [DF_Handover_IsActive] DEFAULT(1),
        [CreatedAt]    DATETIME2(0)   NOT NULL CONSTRAINT [DF_Handover_Created]  DEFAULT(GETDATE()),
        CONSTRAINT [PK_Handover] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX [IX_Handover_Date] ON [dbo].[Handover] ([UnitCode],[HandoverDate]);

    DECLARE @t SYSNAME = N'Handover';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'護理交班/日誌摘要（W52）。純自建。', N'SCHEMA',N'dbo',N'TABLE',@t;
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主鍵流水號',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Id';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'所屬單位代碼',                       N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UnitCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'交班日期',                           N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'HandoverDate';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'班別',                               N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'ShiftType';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'交班內容（長文字）',                 N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Content';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'撰寫者員編',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'AuthorEmpNo';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'是否啟用',                           N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'IsActive';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'建立時間',                           N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CreatedAt';
END
GO

/* ───────────────────────────────────────────────────────────────────────────
   12. OrSpecialHandover — OR 特殊交班（術後轉病房；撈不到先留白）純自建
   ─────────────────────────────────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[OrSpecialHandover]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OrSpecialHandover] (
        [Id]            INT IDENTITY(1,1) NOT NULL,
        [UnitCode]      NVARCHAR(20)  NOT NULL,
        [OpDate]        DATE          NOT NULL,
        [RoomNo]        NVARCHAR(20)  NULL,
        [Hcaseno]       NVARCHAR(20)  NULL,
        [Content]       NVARCHAR(MAX) NULL,
        [FromWard]      NVARCHAR(20)  NULL,
        [ToWard]        NVARCHAR(20)  NULL,
        [IsolationFlag] BIT           NOT NULL CONSTRAINT [DF_OrHandover_Iso]    DEFAULT(0),
        [SpecialFlag]   BIT           NOT NULL CONSTRAINT [DF_OrHandover_Spec]   DEFAULT(0),
        [IsActive]      BIT           NOT NULL CONSTRAINT [DF_OrHandover_Active] DEFAULT(1),
        [CreatedAt]     DATETIME2(0)  NOT NULL CONSTRAINT [DF_OrHandover_Created] DEFAULT(GETDATE()),
        CONSTRAINT [PK_OrSpecialHandover] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX [IX_OrHandover_Date] ON [dbo].[OrSpecialHandover] ([UnitCode],[OpDate]);

    DECLARE @t SYSNAME = N'OrSpecialHandover';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'OR 特殊交班（術後轉病房）。內容源自流動護理師護理紀錄，盡量帶入、撈不到先留白。純自建。', N'SCHEMA',N'dbo',N'TABLE',@t;
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主鍵流水號',                                    N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Id';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'所屬單位代碼（or）',                            N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UnitCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'手術日期',                                      N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'OpDate';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'刀房（OR-01..08）。院方對應 HIS OR.OPORDER.OROPROOM', N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'RoomNo';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'就醫案號。院方對應 API hcaseno',                N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Hcaseno';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'特殊交班內容（長文字）',                        N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Content';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'來源病房',                                      N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'FromWard';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'轉入病房',                                      N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'ToWard';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'隔離旗標（由病房帶到手術室）',                  N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'IsolationFlag';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'測謀旗標',                                      N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'SpecialFlag';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'是否啟用',                                      N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'IsActive';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'建立時間',                                      N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CreatedAt';
END
GO

/* ───────────────────────────────────────────────────────────────────────────
   13. CareTeam — 照護團隊（科別/職別/姓名/電話）純自建
   ─────────────────────────────────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[CareTeam]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[CareTeam] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [UnitCode]  NVARCHAR(20)  NOT NULL,
        [DeptName]  NVARCHAR(50)  NULL,
        [RoleTitle] NVARCHAR(50)  NULL,
        [Name]      NVARCHAR(50)  NOT NULL,
        [Phone]     NVARCHAR(30)  NULL,
        [IsActive]  BIT           NOT NULL CONSTRAINT [DF_CareTeam_IsActive] DEFAULT(1),
        [SortOrder] INT           NOT NULL CONSTRAINT [DF_CareTeam_Sort]     DEFAULT(0),
        [CreatedAt] DATETIME2(0)  NOT NULL CONSTRAINT [DF_CareTeam_Created]  DEFAULT(GETDATE()),
        CONSTRAINT [PK_CareTeam] PRIMARY KEY CLUSTERED ([Id])
    );

    DECLARE @t SYSNAME = N'CareTeam';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'照護團隊（科別/職別/姓名/電話），W52。純自建。', N'SCHEMA',N'dbo',N'TABLE',@t;
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主鍵流水號',                       N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Id';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'所屬單位代碼',                     N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UnitCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'科別名稱',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DeptName';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'職別/職稱',                        N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'RoleTitle';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'姓名',                             N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Name';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'聯絡電話',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Phone';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'是否啟用',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'IsActive';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'顯示排序',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'SortOrder';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'建立時間',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CreatedAt';
END
GO

/* ───────────────────────────────────────────────────────────────────────────
   14. OrShiftAssignment — OR 刷手/流動護理師 3 班派班（高榮無 API）純自建
   ─────────────────────────────────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[OrShiftAssignment]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OrShiftAssignment] (
        [Id]                    INT IDENTITY(1,1) NOT NULL,
        [UnitCode]              NVARCHAR(20)  NOT NULL,
        [DutyDate]              DATE          NOT NULL,
        [ShiftType]             NVARCHAR(10)  NOT NULL,
        [RoomNo]                NVARCHAR(20)  NULL,
        [ScrubNurseEmpNo]       NVARCHAR(20)  NULL,
        [CirculatingNurseEmpNo] NVARCHAR(20)  NULL,
        [CreatedAt]             DATETIME2(0)  NOT NULL CONSTRAINT [DF_OrShift_Created] DEFAULT(GETDATE()),
        CONSTRAINT [PK_OrShiftAssignment] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX [IX_OrShift_Date] ON [dbo].[OrShiftAssignment] ([UnitCode],[DutyDate],[ShiftType]);

    DECLARE @t SYSNAME = N'OrShiftAssignment';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'OR 刷手/流動護理師 3 班派班。高榮派班系統無 API，純自建。', N'SCHEMA',N'dbo',N'TABLE',@t;
    EXEC sys.sp_addextendedproperty N'MS_Description', N'主鍵流水號',                       N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'Id';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'所屬單位代碼（or）',               N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'UnitCode';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'值班日期',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'DutyDate';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'班別（3 班）',                     N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'ShiftType';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'刀房。院方對應 HIS OR.OPORDER.OROPROOM', N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'RoomNo';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'刷手護理師員編，→ NurseStaff.EmployeeNo',  N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'ScrubNurseEmpNo';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'流動護理師員編，→ NurseStaff.EmployeeNo',  N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CirculatingNurseEmpNo';
    EXEC sys.sp_addextendedproperty N'MS_Description', N'建立時間',                         N'SCHEMA',N'dbo',N'TABLE',@t,N'COLUMN',N'CreatedAt';
END
GO

PRINT N'KMSH 自建後台 schema v1 建立完成（14 表，含欄位 memo / extended property）。';
GO
