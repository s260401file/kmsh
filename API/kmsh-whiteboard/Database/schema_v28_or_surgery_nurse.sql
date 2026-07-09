/* =============================================================================
   KMSH OR 逐台刀 刷手/流動/備註 覆蓋表 [dbo].[OrSurgeryNurse]（v28）
   -----------------------------------------------------------------------------
   同一刀房同一天可能多台刀、每台刀刷手/流動可能不同人，故以「單台刀」為鍵覆蓋。
   鍵＝手術日期+白板房號+病歷號+預計開始時間（與 OrSurgery / OrDaily 一致）。
   掛到 /or/surgerylist（後台顯示現值）與 /or 看板（刀房卡彈窗顯示）。可重複執行。
   以 sqlcmd 套用請加 -f 65001（UTF-8）；或用 SSMS 執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[OrSurgeryNurse]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OrSurgeryNurse] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [OpDate]     DATE          NOT NULL,          -- 手術日期
        [RoomId]     NVARCHAR(20)  NOT NULL,          -- 白板房號 OR-xx
        [ChartNo]    NVARCHAR(20)  NOT NULL,          -- 病歷號
        [OpTime]     NVARCHAR(10)  NOT NULL,          -- 預計開始 HH:mm
        [ScrubNurse] NVARCHAR(50)  NULL,              -- 刷手護理師
        [CircNurse]  NVARCHAR(50)  NULL,              -- 流動護理師
        [Note]       NVARCHAR(400) NULL,              -- 備註
        [UpdatedAt]  DATETIME2(0) NOT NULL CONSTRAINT DF_OSN_Upd DEFAULT(GETDATE()),
        [CreatedAt]  DATETIME2(0) NOT NULL CONSTRAINT DF_OSN_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_OrSurgeryNurse] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_OrSurgeryNurse_Key] UNIQUE ([OpDate],[RoomId],[ChartNo],[OpTime])
    );
    CREATE INDEX IX_OSN_OpDate ON [dbo].[OrSurgeryNurse] ([OpDate]);
END
GO

PRINT N'[dbo].[OrSurgeryNurse] 建立完成（逐台刀刷手/流動/備註覆蓋）。';
GO
