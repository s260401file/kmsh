/* =============================================================================
   KMSH OR 手術派班 ＋ 特殊交班（v8，全自建，高榮無 API）
   -----------------------------------------------------------------------------
   OrShiftStaff（班級：護理長/麻醉/體循）、OrShiftRoom（房×班 刷手/流動）、
   OrHandover（術後特殊交班）。種子照搬現有前端 mock（scheduleData/handoverData）。
   可重複執行（OBJECT_ID 建表保護；IF NOT EXISTS 種子）。
   ============================================================================= */
SET NOCOUNT ON;
GO

/* ── 1. 班級人員 OrShiftStaff ───────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[OrShiftStaff]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OrShiftStaff] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [UnitCode]  NVARCHAR(20) NOT NULL,             -- 'OR'
        [ShiftType] NVARCHAR(10) NOT NULL,             -- 白班/小夜/大夜
        [Role]      NVARCHAR(10) NOT NULL,             -- 護理長/麻醉/體循
        [Name]      NVARCHAR(50) NULL,
        [RoleTitle] NVARCHAR(50) NULL,                 -- 職稱（如「主治麻醉科醫師」）
        [Ext]       NVARCHAR(20) NULL,
        [SortOrder] INT NOT NULL CONSTRAINT DF_OSS_Sort     DEFAULT(0),
        [IsActive]  BIT NOT NULL CONSTRAINT DF_OSS_IsActive DEFAULT(1),
        [UpdatedAt] DATETIME2(0) NOT NULL CONSTRAINT DF_OSS_Updated DEFAULT(GETDATE()),
        [CreatedAt] DATETIME2(0) NOT NULL CONSTRAINT DF_OSS_Created DEFAULT(GETDATE()),
        CONSTRAINT [PK_OrShiftStaff] PRIMARY KEY CLUSTERED ([Id])
    );
END
GO

/* ── 2. 房×班 刷手/流動 OrShiftRoom ─────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[OrShiftRoom]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OrShiftRoom] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [UnitCode]  NVARCHAR(20) NOT NULL,             -- 'OR'
        [ShiftType] NVARCHAR(10) NOT NULL,             -- 白班/小夜/大夜
        [RoomId]    NVARCHAR(20) NOT NULL,             -- OR-01…（對 OrRoom）
        [ScrubNurse] NVARCHAR(50) NULL,                -- 刷手護理師
        [CircNurse]  NVARCHAR(50) NULL,                -- 流動護理師
        [Ext]       NVARCHAR(20) NULL,                 -- 刀房分機
        [SortOrder] INT NOT NULL CONSTRAINT DF_OSR_Sort     DEFAULT(0),
        [IsActive]  BIT NOT NULL CONSTRAINT DF_OSR_IsActive DEFAULT(1),
        [UpdatedAt] DATETIME2(0) NOT NULL CONSTRAINT DF_OSR_Updated DEFAULT(GETDATE()),
        [CreatedAt] DATETIME2(0) NOT NULL CONSTRAINT DF_OSR_Created DEFAULT(GETDATE()),
        CONSTRAINT [PK_OrShiftRoom] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_OrShiftRoom] UNIQUE ([UnitCode],[ShiftType],[RoomId])
    );
END
GO

/* ── 3. 特殊交班 OrHandover ─────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[OrHandover]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OrHandover] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [UnitCode]  NVARCHAR(20) NOT NULL,             -- 'OR'
        [Hhisnum]   NVARCHAR(20) NULL,                 -- 病歷號
        [RoomId]    NVARCHAR(20) NULL,
        [PatientName] NVARCHAR(50) NULL,
        [Gender]    NVARCHAR(2)  NULL,
        [Age]       INT NULL,
        [SurgeryName] NVARCHAR(200) NULL,
        [SurgerySource] NVARCHAR(20) NULL,             -- 急診刀/門診刀/住院刀
        [SurgeonName] NVARCHAR(50) NULL,
        [DestWard]  NVARCHAR(50) NULL,                 -- 術後轉往病房
        [DestBed]   NVARCHAR(30) NULL,
        [EndTime]   NVARCHAR(10) NULL,                 -- 結束時間（null=進行中）
        [BloodLoss] INT NULL,                          -- 出血 mL
        [BloodTransfusion] INT NULL,                   -- 輸血 單位
        [DrainDetails] NVARCHAR(200) NULL,
        [SpecialNotes] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL CONSTRAINT DF_OHD_Sort     DEFAULT(0),
        [IsActive]  BIT NOT NULL CONSTRAINT DF_OHD_IsActive DEFAULT(1),
        [UpdatedAt] DATETIME2(0) NOT NULL CONSTRAINT DF_OHD_Updated DEFAULT(GETDATE()),
        [CreatedAt] DATETIME2(0) NOT NULL CONSTRAINT DF_OHD_Created DEFAULT(GETDATE()),
        CONSTRAINT [PK_OrHandover] PRIMARY KEY CLUSTERED ([Id])
    );
END
GO

/* ── 種子：班級人員（照搬 scheduleData）────────────────────────────── */
IF NOT EXISTS (SELECT 1 FROM [dbo].[OrShiftStaff] WHERE UnitCode='OR')
BEGIN
    INSERT INTO [dbo].[OrShiftStaff] (UnitCode,ShiftType,Role,Name,RoleTitle,Ext,SortOrder) VALUES
      ('OR',N'白班',N'護理長',N'陳○雅護理長',N'護理長',N'5510',10),
      ('OR',N'白班',N'麻醉',N'劉○欣 醫師',  N'主治麻醉科醫師',N'5520',20),
      ('OR',N'白班',N'麻醉',N'林○恩 住院醫師',N'住院醫師（R2）',N'5521',21),
      ('OR',N'白班',N'麻醉',N'許○明 住院醫師',N'住院醫師（R1）',N'5522',22),
      ('OR',N'白班',N'體循',N'蔡○中 技師',  N'體外循環技師',N'5530',30),
      ('OR',N'小夜',N'護理長',N'陳○雅護理長',N'護理長',N'5510',10),
      ('OR',N'小夜',N'麻醉',N'蔡○婷 醫師',  N'值班麻醉科醫師',N'5523',20),
      ('OR',N'小夜',N'麻醉',N'謝○凱 住院醫師',N'住院醫師（R2）',N'5524',21),
      ('OR',N'大夜',N'護理長',N'陳○雅護理長',N'護理長',N'5510',10),
      ('OR',N'大夜',N'麻醉',N'洪○安 醫師',  N'值班麻醉科醫師（On-call）',N'5525',20);
END
GO

/* ── 種子：房×班 刷手/流動（照搬 scheduleData）────────────────────── */
IF NOT EXISTS (SELECT 1 FROM [dbo].[OrShiftRoom] WHERE UnitCode='OR')
BEGIN
    INSERT INTO [dbo].[OrShiftRoom] (UnitCode,ShiftType,RoomId,ScrubNurse,CircNurse,Ext,SortOrder) VALUES
      ('OR',N'白班',N'OR-01',N'張○惠護理師',N'李○婷護理師',N'5501',10),
      ('OR',N'白班',N'OR-02',N'周○娟護理師',N'王○珊護理師',N'5502',20),
      ('OR',N'白班',N'OR-03',N'張○惠護理師',N'吳○華護理師',N'5503',30),
      ('OR',N'白班',N'OR-05',N'周○娟護理師',N'張○惠護理師',N'5504',40),
      ('OR',N'白班',N'OR-06',N'李○婷護理師',N'周○娟護理師',N'5505',50),
      ('OR',N'白班',N'OR-07',N'王○珊護理師',N'李○婷護理師',N'5506',60),
      ('OR',N'白班',N'OR-08',N'張○惠護理師',N'周○娟護理師',N'5507',70),
      ('OR',N'小夜',N'OR-01',N'陳○儀護理師',N'黃○芸護理師',N'5501',10),
      ('OR',N'小夜',N'OR-02',N'蔡○穎護理師',N'陳○儀護理師',N'5502',20),
      ('OR',N'小夜',N'OR-03',N'黃○芸護理師',N'蔡○穎護理師',N'5503',30),
      ('OR',N'小夜',N'OR-05',N'陳○儀護理師',N'黃○芸護理師',N'5504',40),
      ('OR',N'小夜',N'OR-06',N'蔡○穎護理師',N'陳○儀護理師',N'5505',50),
      ('OR',N'小夜',N'OR-07',NULL,NULL,N'5506',60),
      ('OR',N'小夜',N'OR-08',NULL,NULL,N'5507',70),
      ('OR',N'大夜',N'OR-01',N'林○心護理師',N'方○婷護理師',N'5501',10),
      ('OR',N'大夜',N'OR-02',N'方○婷護理師',N'林○心護理師',N'5502',20),
      ('OR',N'大夜',N'OR-03',N'林○心護理師',N'方○婷護理師',N'5503',30),
      ('OR',N'大夜',N'OR-05',NULL,NULL,N'5504',40),
      ('OR',N'大夜',N'OR-06',NULL,NULL,N'5505',50),
      ('OR',N'大夜',N'OR-07',NULL,NULL,N'5506',60),
      ('OR',N'大夜',N'OR-08',NULL,NULL,N'5507',70);
END
GO

/* ── 種子：特殊交班（照搬 handoverData）────────────────────────────── */
IF NOT EXISTS (SELECT 1 FROM [dbo].[OrHandover] WHERE UnitCode='OR')
BEGIN
    INSERT INTO [dbo].[OrHandover] (UnitCode,Hhisnum,RoomId,PatientName,Gender,Age,SurgeryName,SurgerySource,SurgeonName,DestWard,DestBed,EndTime,BloodLoss,BloodTransfusion,DrainDetails,SpecialNotes,SortOrder) VALUES
      ('OR',N'F701234606',N'OR-07',N'林○雯',N'F',29,N'左手攣縮疤痕鬆解植皮術',N'門診刀',N'林○泰醫師',N'整形外科病房（W34）',N'W34-012',N'10:18',30,0,N'無引流管',N'植皮部位左手背，加壓包紮固定。術後返回病房後請勿抬高超過心臟水平以上，觀察植皮色澤及血運。',10),
      ('OR',N'C401234603',N'OR-03',N'張○強',N'M',34,N'右股骨骨折切開復位髓內釘固定術 ORIF',N'急診刀',N'王○哲醫師',N'骨科病房（W52）',N'W52-014',NULL,350,2,N'Hemovac × 1（右大腿外側）',N'術中輸血 2 單位（RBC），術後繼續觀察 Hb。右下肢伸直固定，禁止重量承重，48小時內監測肢端循環（色澤/溫度/脈搏）。',20),
      ('OR',N'A201234601',N'OR-01',N'王○明',N'M',65,N'腹腔鏡膽囊切除術 LC',N'住院刀',N'黃○誠醫師',N'一般外科病房（W52）',N'W52-008',NULL,20,0,N'無引流管（膽囊床無明顯出血）',N'術中無特殊狀況，腹腔鏡操作順利，膽囊已完整取出。術後 NPO 6 小時後可開始進清流質。Trocar 傷口 4 處，注意腹部傷口是否有膽汁滲漏。',30);
END
GO

PRINT N'OR 手術派班(OrShiftStaff/OrShiftRoom)＋特殊交班(OrHandover) 建立並植入種子。';
GO
