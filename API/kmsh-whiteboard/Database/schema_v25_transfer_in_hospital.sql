/* =============================================================================
   KMSH WardPatientExt 補「轉入醫院」欄位 [TransferInHospital]（v25）
   -----------------------------------------------------------------------------
   ER 轉出/入醫院拆為兩欄分開記錄：既有 [TransferHospital] 改作「轉出醫院」，
   新增 [TransferInHospital]「轉入醫院」。可重複執行（冪等）。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.WardPatientExt','TransferInHospital') IS NULL
    ALTER TABLE [dbo].[WardPatientExt] ADD [TransferInHospital] NVARCHAR(50) NULL;   -- 轉入醫院（自哪家醫院轉入）
GO

PRINT N'[dbo].[WardPatientExt] 已補 TransferInHospital（轉入醫院）欄位。';
GO
