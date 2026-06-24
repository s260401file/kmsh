/* =============================================================================
   KMSH OR 手術動態 — 刀房主檔 [dbo].[OrRoom] ＋ WardPatientExt 補 OR 欄位（v6）
   -----------------------------------------------------------------------------
   目的：院方新開放 Board_OR（手術排程，刀房代碼 R1~R7）。自建「刀房主檔」做
         R{n} ↔ OR-{房號} 對應與排序，板面照主檔鋪 4×2 房卡、Board_OR 以 ApiRoom merge。
         另為 WardPatientExt 補 OR 專屬欄位（手術狀態/實際起訖/刷手/流動）。
   可重複執行（OBJECT_ID / COL_LENGTH 保護、MERGE 種子）。
   ============================================================================= */
SET NOCOUNT ON;
GO

/* ── 1. 刀房主檔 OrRoom ─────────────────────────────────────────────── */
IF OBJECT_ID(N'[dbo].[OrRoom]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OrRoom] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [UnitCode]  NVARCHAR(20)  NOT NULL,            -- 固定 'OR'
        [RoomId]    NVARCHAR(20)  NOT NULL,            -- 白板房號（OR-01…OR-08，無 OR-04）
        [ApiRoom]   NVARCHAR(20)  NULL,                -- Board_OR「刀房」代碼（R1…R7）
        [SortOrder] INT NOT NULL CONSTRAINT DF_OrRoom_Sort     DEFAULT(0),
        [IsActive]  BIT NOT NULL CONSTRAINT DF_OrRoom_IsActive DEFAULT(1),
        [UpdatedAt] DATETIME2(0) NOT NULL CONSTRAINT DF_OrRoom_Updated DEFAULT(GETDATE()),
        [CreatedAt] DATETIME2(0) NOT NULL CONSTRAINT DF_OrRoom_Created DEFAULT(GETDATE()),
        CONSTRAINT [PK_OrRoom] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_OrRoom_Unit_Room] UNIQUE ([UnitCode],[RoomId])
    );
END
GO

/* 種子：7 房，R{n}→第 n 個 UI 房（跳過已撤 OR-04；使用者確認）。已存在則略過。 */
MERGE [dbo].[OrRoom] AS t
USING (VALUES
  ('OR', N'OR-01', N'R1', 10),
  ('OR', N'OR-02', N'R2', 20),
  ('OR', N'OR-03', N'R3', 30),
  ('OR', N'OR-05', N'R4', 40),
  ('OR', N'OR-06', N'R5', 50),
  ('OR', N'OR-07', N'R6', 60),
  ('OR', N'OR-08', N'R7', 70)
) AS s (UnitCode,RoomId,ApiRoom,SortOrder)
ON (t.UnitCode=s.UnitCode AND t.RoomId=s.RoomId)
WHEN NOT MATCHED THEN
  INSERT (UnitCode,RoomId,ApiRoom,SortOrder,IsActive,UpdatedAt,CreatedAt)
  VALUES (s.UnitCode,s.RoomId,s.ApiRoom,s.SortOrder,1,GETDATE(),GETDATE());
GO

/* ── 2. WardPatientExt 補 OR 專屬欄位（UnitCode='OR' 用；其他單位留空）── */
IF COL_LENGTH('dbo.WardPatientExt','ScrubNurse')    IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [ScrubNurse]    NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.WardPatientExt','CircNurse')     IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [CircNurse]     NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.WardPatientExt','SurgeryStatus') IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [SurgeryStatus] NVARCHAR(20) NULL;   -- 手術中/準備中/已完成
IF COL_LENGTH('dbo.WardPatientExt','StartTime')     IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [StartTime]     NVARCHAR(10) NULL;   -- 實際進刀房 HH:mm
IF COL_LENGTH('dbo.WardPatientExt','EndTime')       IS NULL ALTER TABLE [dbo].[WardPatientExt] ADD [EndTime]       NVARCHAR(10) NULL;   -- 實際出刀房 HH:mm
GO

PRINT N'[dbo].[OrRoom] 建立並植入 7 房種子；WardPatientExt 已補 OR 欄位。';
GO
