/* =============================================================================
   KMSH 病室動態 — 自建臨床補充層 [dbo].[WardPatientExt]（v2）
   -----------------------------------------------------------------------------
   用途：補 Board_bed（住院在床＋基本，真實資料）不足的臨床欄位（科別/主治/責護/
         診斷/病況/狀態/各註記旗標/管路…）。一病人一列，以 UnitCode＋Hhisnum 為鍵。
         後台可增刪改；待 HIS/DB2_DUMP 開放後逐欄改由院方來源。
   合併：BoardController GET /api/Board/w52 以「病歷號」把本表疊到 Board_bed 上。
   種子：以 2026-06 Board_bed W52 實測回應的 11 個真實病歷號放入 mock 臨床，便於展示合併。
   本檔可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[WardPatientExt]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[WardPatientExt] (
        [Id]              INT IDENTITY(1,1) NOT NULL,
        [UnitCode]        NVARCHAR(20)  NOT NULL,
        [Hhisnum]         NVARCHAR(20)  NOT NULL,   -- 病歷號（與 Board_bed 對應）
        [Department]      NVARCHAR(50)  NULL,
        [AttendingDoctor] NVARCHAR(50)  NULL,
        [PrimaryNurse]    NVARCHAR(50)  NULL,
        [Diagnosis]       NVARCHAR(500) NULL,
        [Condition]       NVARCHAR(20)  NULL,       -- 穩定/重症/危急
        [BedStatus]       NVARCHAR(20)  NULL,       -- occupied/isolation/transfer/transfer-in/discharge
        [AdmissionDate]   NVARCHAR(20)  NULL,       -- MM/DD
        [Dnr]             BIT NOT NULL CONSTRAINT DF_WPE_Dnr        DEFAULT(0),
        [Isolation]       NVARCHAR(20)  NULL,
        [FallRisk]        BIT NOT NULL CONSTRAINT DF_WPE_Fall       DEFAULT(0),
        [Dependency]      NVARCHAR(10)  NULL,
        [Confidential]    BIT NOT NULL CONSTRAINT DF_WPE_Conf       DEFAULT(0),
        [NoTreatment]     BIT NOT NULL CONSTRAINT DF_WPE_NoTx       DEFAULT(0),
        [Npo]             BIT NOT NULL CONSTRAINT DF_WPE_Npo        DEFAULT(0),
        [Allergy]         BIT NOT NULL CONSTRAINT DF_WPE_Allergy    DEFAULT(0),
        [Rrt]             BIT NOT NULL CONSTRAINT DF_WPE_Rrt        DEFAULT(0),
        [Chemo]           BIT NOT NULL CONSTRAINT DF_WPE_Chemo      DEFAULT(0),
        [Transport]       NVARCHAR(10)  NULL,       -- 輪椅/推床
        [Oxygen]          BIT NOT NULL CONSTRAINT DF_WPE_Oxygen     DEFAULT(0),
        [Renal]           BIT NOT NULL CONSTRAINT DF_WPE_Renal      DEFAULT(0),
        [PortCath]        BIT NOT NULL CONSTRAINT DF_WPE_Port       DEFAULT(0),
        [DLVC]            BIT NOT NULL CONSTRAINT DF_WPE_Dlvc       DEFAULT(0),
        [Foley]           BIT NOT NULL CONSTRAINT DF_WPE_Foley      DEFAULT(0),
        [CVC]             BIT NOT NULL CONSTRAINT DF_WPE_Cvc        DEFAULT(0),
        [CardiacCath]     BIT NOT NULL CONSTRAINT DF_WPE_Cardiac    DEFAULT(0),
        [Surgery]         BIT NOT NULL CONSTRAINT DF_WPE_Surgery    DEFAULT(0),
        [Exam]            BIT NOT NULL CONSTRAINT DF_WPE_Exam       DEFAULT(0),
        [Consult]         BIT NOT NULL CONSTRAINT DF_WPE_Consult    DEFAULT(0),
        [Notes]           NVARCHAR(500) NULL,
        [IsActive]        BIT NOT NULL CONSTRAINT DF_WPE_IsActive   DEFAULT(1),
        [UpdatedAt]       DATETIME2(0)  NOT NULL CONSTRAINT DF_WPE_Updated DEFAULT(GETDATE()),
        [CreatedAt]       DATETIME2(0)  NOT NULL CONSTRAINT DF_WPE_Created DEFAULT(GETDATE()),
        CONSTRAINT [PK_WardPatientExt] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_WardPatientExt_Unit_His] UNIQUE ([UnitCode],[Hhisnum])
    );
    EXEC sys.sp_addextendedproperty N'MS_Description',
        N'病室動態臨床補充層：補 Board_bed 不足的臨床欄位（一病人一列，鍵 UnitCode+Hhisnum）；後台可增刪改，待 HIS 開放再切換。',
        N'SCHEMA',N'dbo',N'TABLE',N'WardPatientExt';
END
GO

/* 種子：W52 mock 臨床（對應 2026-06 Board_bed 真實病歷號）。可重複執行（已存在則略過）。 */
MERGE [dbo].[WardPatientExt] AS t
USING (VALUES
  ('W52','19021524','骨科','張○醫師','陳○護理師','Hip fracture, Post-OP Day 3','穩定','occupied','06/18',1,'無',1,0,0,0,0,'輪椅',0,0,0,0,0,0,0),
  ('W52','16725696','胸腔內科','徐○醫師','蔡○護理師','Pneumonia','重症','occupied','06/15',0,'無',0,0,0,0,0,NULL,1,0,0,1,0,0,0),
  ('W52','19027179','神經外科','鄭○醫師','郭○護理師','Intracerebral hemorrhage','危急','occupied','06/10',1,'無',0,0,0,1,0,NULL,0,0,0,1,1,0,0),
  ('W52','16413049','感染科','王○醫師','鄭○護理師','Cellulitis, MRSA','重症','isolation','06/12',0,'接觸隔離',0,0,0,0,0,NULL,0,0,0,0,0,0,1),
  ('W52','5569513','泌尿科','許○醫師','林○護理師','BPH, Post-TURP','穩定','occupied','06/16',0,'無',0,0,0,0,0,NULL,0,0,0,0,0,0,0),
  ('W52','8785100','一般外科','吳○醫師','陳○護理師','Appendectomy Post-OP Day 1','穩定','occupied','06/17',0,'無',0,1,0,0,0,NULL,0,0,0,0,0,1,0),
  ('W52','10000990','心臟內科','方○醫師','林○護理師','CHF NYHA III, Af','重症','occupied','06/14',0,'無',0,0,0,0,0,NULL,1,0,0,1,1,0,1),
  ('W52','2566036','胸腔內科','徐○醫師','蔡○護理師','COPD, Pneumonia','重症','occupied','06/13',0,'無',0,0,1,0,0,NULL,1,0,0,0,0,0,0),
  ('W52','16101896','老人醫學科','鄭○醫師','林○護理師','Dementia, Aspiration pneumonia','穩定','occupied','06/11',0,'無',1,0,0,0,0,NULL,0,0,0,1,0,0,0),
  ('W52','5577552','腎臟科','方○醫師','陳○護理師','CKD Stage 4','重症','transfer','06/09',0,'無',0,0,0,0,0,NULL,0,1,0,0,0,0,0),
  ('W52','12180180','腫瘤科','柯○醫師','蔡○護理師','Breast cancer Stage III, chemo','重症','occupied','06/10',0,'無',0,0,1,0,1,NULL,0,0,1,0,0,0,0)
) AS s (UnitCode,Hhisnum,Department,AttendingDoctor,PrimaryNurse,Diagnosis,Condition,BedStatus,AdmissionDate,
        Dnr,Isolation,FallRisk,Npo,Allergy,Rrt,Chemo,Transport,Oxygen,Renal,PortCath,Foley,CVC,Surgery,Consult)
ON (t.UnitCode = s.UnitCode AND t.Hhisnum = s.Hhisnum)
WHEN NOT MATCHED THEN
  INSERT (UnitCode,Hhisnum,Department,AttendingDoctor,PrimaryNurse,Diagnosis,Condition,BedStatus,AdmissionDate,
          Dnr,Isolation,FallRisk,Npo,Allergy,Rrt,Chemo,Transport,Oxygen,Renal,PortCath,Foley,CVC,Surgery,Consult,
          IsActive,UpdatedAt,CreatedAt)
  VALUES (s.UnitCode,s.Hhisnum,s.Department,s.AttendingDoctor,s.PrimaryNurse,s.Diagnosis,s.Condition,s.BedStatus,s.AdmissionDate,
          s.Dnr,s.Isolation,s.FallRisk,s.Npo,s.Allergy,s.Rrt,s.Chemo,s.Transport,s.Oxygen,s.Renal,s.PortCath,s.Foley,s.CVC,s.Surgery,s.Consult,
          1,GETDATE(),GETDATE());
GO

PRINT N'[dbo].[WardPatientExt] 建立完成並植入 W52 mock 種子。';
GO
