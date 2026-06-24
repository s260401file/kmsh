/* =============================================================================
   KMSH 病人臨床補充 overlay — ER / OR 種子（v7）
   -----------------------------------------------------------------------------
   為「目前在室(ER)／今日刀表(OR)」的真實病歷號補 WardPatientExt overlay（mock 臨床/狀態），
   讓 ER/OR 病室動態與後台「病人臨床補充」有資料（比照 W52/ICU 種子）。
   以 (UnitCode,Hhisnum) 為鍵、MERGE 僅新增（已存在略過、可重跑）。
   ⚠ 病歷號為 2026-06-24 當下實況；院方資料更替後這些列在後台會顯示「已離床/未排今日」。
   ============================================================================= */
SET NOCOUNT ON;
GO

MERGE [dbo].[WardPatientExt] AS t
USING (VALUES
  -- 單位, 病歷號, 科別, 責任護理師, 診斷, 隔離, 留觀, 到院日, 到院時, 刷手, 流動, 手術狀態, 實際進刀房, 備註
  ('ER', N'7675990',  N'心臟內科', N'林○婷護理師', N'Chest pain, R/O ACS',           N'無', 1, N'06/24', N'08:30', NULL,          NULL,          NULL,     NULL,     N'Troponin 序列追蹤，心電圖監測中'),
  ('OR', N'4399206',  N'骨科',     NULL,          N'Intraarticular injection',       NULL,  0, NULL,    NULL,    N'張○惠護理師', N'李○婷護理師', N'準備中', NULL,     N'局部麻醉關節注射'),
  ('OR', N'10840670', N'骨科',     NULL,          N'Removal of internal fixator',    NULL,  0, NULL,    NULL,    N'周○娟護理師', N'王○珊護理師', N'準備中', NULL,     N'移除內固定物，術前 NPO'),
  ('OR', N'16375529', N'骨科',     NULL,          N'Total hip replacement',          NULL,  0, NULL,    NULL,    N'李○婷護理師', N'周○娟護理師', N'手術中', N'12:38', N'全人工髖關節置換，備血 2U'),
  ('OR', N'13982520', N'眼科',     NULL,          N'Cataract, Phaco + IOL',          NULL,  0, NULL,    NULL,    N'王○珊護理師', N'張○惠護理師', N'手術中', N'13:36', N'白內障超音波乳化＋人工水晶體'),
  ('OR', N'19049899', N'眼科',     NULL,          N'Cataract, Phaco + IOL',          NULL,  0, NULL,    NULL,    N'王○珊護理師', N'張○惠護理師', N'準備中', NULL,     N'白內障，接續上一台'),
  ('OR', N'7756840',  N'眼科',     NULL,          N'Cataract, Phaco + IOL',          NULL,  0, NULL,    NULL,    N'李○婷護理師', N'周○娟護理師', N'準備中', NULL,     N'白內障')
) AS s (UnitCode,Hhisnum,Department,PrimaryNurse,Diagnosis,Isolation,Observation,ArrivalDate,ArrivalTime,ScrubNurse,CircNurse,SurgeryStatus,StartTime,Notes)
ON (t.UnitCode = s.UnitCode AND t.Hhisnum = s.Hhisnum)
WHEN NOT MATCHED THEN
  INSERT (UnitCode,Hhisnum,Department,PrimaryNurse,Diagnosis,Isolation,Observation,ArrivalDate,ArrivalTime,ScrubNurse,CircNurse,SurgeryStatus,StartTime,Notes,IsActive,UpdatedAt,CreatedAt)
  VALUES (s.UnitCode,s.Hhisnum,s.Department,s.PrimaryNurse,s.Diagnosis,s.Isolation,s.Observation,s.ArrivalDate,s.ArrivalTime,s.ScrubNurse,s.CircNurse,s.SurgeryStatus,s.StartTime,s.Notes,1,GETDATE(),GETDATE());
GO

PRINT N'ER/OR 病人臨床補充 overlay 種子完成（ER 1 筆、OR 6 筆）。';
GO
