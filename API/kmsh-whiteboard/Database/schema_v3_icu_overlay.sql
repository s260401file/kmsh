/* =============================================================================
   KMSH 病室動態 — ICU 支援（v3）
   -----------------------------------------------------------------------------
   1) [dbo].[WardPatientExt] 加管路欄位 Ventilator / Crrt / Ng（ICU 需要；W52 不用）。
   2) ICU(UnitCode='ICU') overlay mock 種子：對應 2026-06 AICU(4F) Board_bed 實測 16 個真實病歷號。
   可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'[dbo].[WardPatientExt]', N'Ventilator') IS NULL
    ALTER TABLE [dbo].[WardPatientExt] ADD [Ventilator] BIT NOT NULL CONSTRAINT DF_WPE_Vent DEFAULT(0);
GO
IF COL_LENGTH(N'[dbo].[WardPatientExt]', N'Crrt') IS NULL
    ALTER TABLE [dbo].[WardPatientExt] ADD [Crrt] BIT NOT NULL CONSTRAINT DF_WPE_Crrt DEFAULT(0);
GO
IF COL_LENGTH(N'[dbo].[WardPatientExt]', N'Ng') IS NULL
    ALTER TABLE [dbo].[WardPatientExt] ADD [Ng] BIT NOT NULL CONSTRAINT DF_WPE_Ng DEFAULT(0);
GO

/* ICU mock 種子（病歷號對應 AICU 4F 實測在床病人）。已存在則略過。 */
MERGE [dbo].[WardPatientExt] AS t
USING (VALUES
 ('ICU','16545494','胸腔內科','蘇○醫師','陳○護理師','Septic shock, Pneumonia','重症','occupied','06/12',0,'無',0,1,0,0,0,0,1,1,0,1,1,0,1),
 ('ICU','13592170','心臟外科','李○醫師','周○護理師','Post-OP CABG D2','重症','occupied','06/15',0,'無',0,1,1,0,0,0,1,1,0,0,1,0,1),
 ('ICU','19028218','神經外科','洪○醫師','郭○護理師','ICH, GCS E2M4Vt','危急','occupied','06/11',1,'無',1,1,0,1,0,0,1,1,0,0,1,0,1),
 ('ICU','16790520','胸腔內科','蘇○醫師','陳○護理師','ARDS','危急','isolation','06/10',0,'空氣隔離',0,0,0,0,0,0,1,1,0,0,1,0,0),
 ('ICU','14351050','腸胃科','李○醫師','趙○護理師','Acute pancreatitis','重症','occupied','06/12',0,'無',1,0,0,0,0,0,1,1,0,0,0,0,1),
 ('ICU','12222910','心臟內科','弘○醫師','賴○護理師','AMI, Cardiogenic shock','重症','occupied','06/13',0,'無',0,0,0,0,0,1,1,1,0,0,0,1,0),
 ('ICU','13276970','腎臟內科','弘○醫師','陳○護理師','Septic shock, AKI','危急','occupied','06/09',0,'無',0,0,0,0,0,0,1,1,0,0,1,1,1),
 ('ICU','16352030','神經外科','洪○醫師','郭○護理師','Subdural hematoma','重症','occupied','06/11',0,'無',1,0,0,0,0,1,1,0,1,0,0,0,0),
 ('ICU','19040701','胸腔內科','蘇○醫師','林○護理師','COVID-19, ARDS','危急','isolation','06/10',0,'空氣隔離',0,0,0,0,0,0,1,1,0,0,1,0,0),
 ('ICU','5796318','一般外科','蘇○醫師','林○護理師','Post-OP Hemicolectomy','穩定','occupied','06/14',0,'無',0,1,0,0,0,0,1,0,1,0,0,0,1),
 ('ICU','14536480','一般外科','李○醫師','趙○護理師','GI perforation, Post-OP','穩定','transfer','06/13',0,'無',0,0,1,0,0,0,0,0,1,0,0,0,0),
 ('ICU','14287390','整形外科','蘇○醫師','李○護理師','Necrotizing fasciitis','重症','isolation','06/09',0,'接觸隔離',0,0,1,0,0,0,1,1,0,1,1,0,1),
 ('ICU','4644639','心臟內科','弘○醫師','林○護理師','CHF, Pulmonary edema','重症','occupied','06/12',1,'無',0,0,0,0,0,1,1,1,0,1,0,0,0),
 ('ICU','243262','肝膽腸胃科','李○醫師','趙○護理師','Liver cirrhosis, HE','重症','occupied','06/10',1,'無',0,0,0,0,0,0,1,0,0,1,0,0,1),
 ('ICU','9537070','泌尿科','蘇○醫師','陳○護理師','Septic shock, UTI','重症','occupied','06/11',0,'無',1,0,1,0,0,0,1,1,0,0,0,0,0),
 ('ICU','4043969','心臟內科','弘○醫師','陳○護理師','Acute heart failure','重症','occupied','06/13',1,'無',1,0,0,0,0,0,1,1,0,0,0,1,0)
) AS s (UnitCode,Hhisnum,Department,AttendingDoctor,PrimaryNurse,Diagnosis,Condition,BedStatus,AdmissionDate,
        Dnr,Isolation,FallRisk,Npo,Allergy,Rrt,Chemo,Oxygen,Foley,CVC,Surgery,Consult,Ventilator,Crrt,Ng)
ON (t.UnitCode = s.UnitCode AND t.Hhisnum = s.Hhisnum)
WHEN NOT MATCHED THEN
  INSERT (UnitCode,Hhisnum,Department,AttendingDoctor,PrimaryNurse,Diagnosis,Condition,BedStatus,AdmissionDate,
          Dnr,Isolation,FallRisk,Npo,Allergy,Rrt,Chemo,Oxygen,Foley,CVC,Surgery,Consult,Ventilator,Crrt,Ng,
          IsActive,UpdatedAt,CreatedAt)
  VALUES (s.UnitCode,s.Hhisnum,s.Department,s.AttendingDoctor,s.PrimaryNurse,s.Diagnosis,s.Condition,s.BedStatus,s.AdmissionDate,
          s.Dnr,s.Isolation,s.FallRisk,s.Npo,s.Allergy,s.Rrt,s.Chemo,s.Oxygen,s.Foley,s.CVC,s.Surgery,s.Consult,s.Ventilator,s.Crrt,s.Ng,
          1,GETDATE(),GETDATE());
GO

PRINT N'WardPatientExt 已加 Ventilator/Crrt/Ng 並植入 ICU mock 種子。';
GO
