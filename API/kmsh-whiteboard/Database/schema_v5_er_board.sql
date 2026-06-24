/* =============================================================================
   KMSH ER 病室動態 — 床位主檔 [dbo].[ErBed] ＋ WardPatientExt 補 ER 狀態欄位（v5）
   -----------------------------------------------------------------------------
   目的：ER 真實床碼對不上寫死平面圖、且 Board_ER 無空床 → 自建「床位主檔」存
         床碼＋分區＋平面圖座標(GridCol/GridRow)，板面照主檔擺床、可顯示空床，
         後台可增刪改；Board_ER 病人以 bedId merge 上去。
         另為 WardPatientExt 補 ER 專屬狀態欄位（留觀/待床/轉床/住院/死亡/到院…）。
   可重複執行（OBJECT_ID / COL_LENGTH 保護、MERGE 種子）。
   ============================================================================= */
SET NOCOUNT ON;
GO

/* ── 1. 床位主檔 ErBed ──────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[ErBed]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ErBed] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [UnitCode]  NVARCHAR(20)  NOT NULL,            -- 固定 'ER'
        [BedId]     NVARCHAR(20)  NOT NULL,            -- 白板床號（MER07 / 負2 / OER01 / MER991）
        [Ward]      NVARCHAR(20)  NULL,                -- 病房前綴（MER/OER/負…），對應 Board_ER「病房」
        [Zone]      NVARCHAR(50)  NULL,                -- 分區（負壓隔離室/急救室/第一診療區…）
        [GridCol]   INT NULL,                          -- 平面圖 grid-column
        [GridRow]   INT NULL,                          -- 平面圖 grid-row
        [SortOrder] INT NOT NULL CONSTRAINT DF_ErBed_Sort     DEFAULT(0),
        [IsActive]  BIT NOT NULL CONSTRAINT DF_ErBed_IsActive DEFAULT(1),
        [UpdatedAt] DATETIME2(0) NOT NULL CONSTRAINT DF_ErBed_Updated DEFAULT(GETDATE()),
        [CreatedAt] DATETIME2(0) NOT NULL CONSTRAINT DF_ErBed_Created DEFAULT(GETDATE()),
        CONSTRAINT [PK_ErBed] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_ErBed_Unit_Bed] UNIQUE ([UnitCode],[BedId])
    );
END
GO

/* 種子：19 床＝沿用 ErLayout.css 現有座標＋mockData 分區。已存在則略過。 */
MERGE [dbo].[ErBed] AS t
USING (VALUES
  ('ER', N'負2',   N'負', N'負壓隔離室', 1, 1,  10),
  ('ER', N'負1',   N'負', N'負壓隔離室', 1, 2,  20),
  ('ER', N'MER01', N'MER',N'急救室',     5, 2,  30),
  ('ER', N'MER02', N'MER',N'第一診療區', 7, 3,  40),
  ('ER', N'MER03', N'MER',N'第一診療區', 8, 3,  50),
  ('ER', N'MER05', N'MER',N'第一診療區', 9, 3,  60),
  ('ER', N'MER06', N'MER',N'第一診療區',10, 3,  70),
  ('ER', N'MER07', N'MER',N'第一診療區',11, 3,  80),
  ('ER', N'MER08', N'MER',N'第二診療區', 6, 5,  90),
  ('ER', N'MER09', N'MER',N'第二診療區', 7, 5, 100),
  ('ER', N'MER10', N'MER',N'第二診療區', 8, 5, 110),
  ('ER', N'MER11', N'MER',N'第二診療區', 9, 5, 120),
  ('ER', N'MER12', N'MER',N'第二診療區',10, 5, 130),
  ('ER', N'MER13', N'MER',N'第二診療區',11, 5, 140),
  ('ER', N'OER01', N'OER',N'第一留觀區', 6, 7, 150),
  ('ER', N'OER02', N'OER',N'第一留觀區', 6, 8, 160),
  ('ER', N'MER993',N'MER',N'待床區',     1, 8, 170),
  ('ER', N'MER992',N'MER',N'待床區',     2, 8, 180),
  ('ER', N'MER991',N'MER',N'待床區',     3, 8, 190)
) AS s (UnitCode,BedId,Ward,Zone,GridCol,GridRow,SortOrder)
ON (t.UnitCode=s.UnitCode AND t.BedId=s.BedId)
WHEN NOT MATCHED THEN
  INSERT (UnitCode,BedId,Ward,Zone,GridCol,GridRow,SortOrder,IsActive,UpdatedAt,CreatedAt)
  VALUES (s.UnitCode,s.BedId,s.Ward,s.Zone,s.GridCol,s.GridRow,s.SortOrder,1,GETDATE(),GETDATE());
GO

/* ── 2. WardPatientExt 補 ER 專屬狀態欄位 ───────────────────────────── */
IF COL_LENGTH('dbo.WardPatientExt','Observation')      IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [Observation]      BIT NOT NULL CONSTRAINT DF_WPE_Observation DEFAULT(0);
IF COL_LENGTH('dbo.WardPatientExt','Awaiting')         IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [Awaiting]         BIT NOT NULL CONSTRAINT DF_WPE_Awaiting    DEFAULT(0);
IF COL_LENGTH('dbo.WardPatientExt','AwaitingType')     IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [AwaitingType]     NVARCHAR(20)  NULL;
IF COL_LENGTH('dbo.WardPatientExt','TransferIn')       IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [TransferIn]       BIT NOT NULL CONSTRAINT DF_WPE_TransferIn  DEFAULT(0);
IF COL_LENGTH('dbo.WardPatientExt','TransferOut')      IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [TransferOut]      BIT NOT NULL CONSTRAINT DF_WPE_TransferOut DEFAULT(0);
IF COL_LENGTH('dbo.WardPatientExt','TransferHospital') IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [TransferHospital] NVARCHAR(50)  NULL;
IF COL_LENGTH('dbo.WardPatientExt','Admitted')         IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [Admitted]         BIT NOT NULL CONSTRAINT DF_WPE_Admitted    DEFAULT(0);
IF COL_LENGTH('dbo.WardPatientExt','AdmBedNo')         IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [AdmBedNo]         NVARCHAR(20)  NULL;
IF COL_LENGTH('dbo.WardPatientExt','Aad')              IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [Aad]              BIT NOT NULL CONSTRAINT DF_WPE_Aad         DEFAULT(0);
IF COL_LENGTH('dbo.WardPatientExt','Mbd')              IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [Mbd]              BIT NOT NULL CONSTRAINT DF_WPE_Mbd         DEFAULT(0);
IF COL_LENGTH('dbo.WardPatientExt','Deceased')         IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [Deceased]         BIT NOT NULL CONSTRAINT DF_WPE_Deceased    DEFAULT(0);
IF COL_LENGTH('dbo.WardPatientExt','ArrivalDate')      IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [ArrivalDate]      NVARCHAR(20)  NULL;
IF COL_LENGTH('dbo.WardPatientExt','ArrivalTime')      IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [ArrivalTime]      NVARCHAR(20)  NULL;
GO

PRINT N'[dbo].[ErBed] 建立並植入 19 床種子；WardPatientExt 已補 ER 狀態欄位。';
GO
