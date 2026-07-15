/* =============================================================================
   KMSH OR 刀房溫溼度記錄表 [dbo].[OrRoomEnv]（v33）
   -----------------------------------------------------------------------------
   OR 每日記錄各刀房（OR-01/02/03/05/06/07/08，共 7 房）的溫度、溼度。
   鍵＝手術日期+白板房號（一天一房一列）。後台可選日期填寫/修改（upsert）；
   兩欄皆空即刪除該列。GET 匿名、POST 需登入（全域 MutationAuthorizationFilter）。
   以 sqlcmd 套用請加 -f 65001（UTF-8）；或用 SSMS 執行。可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[OrRoomEnv]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OrRoomEnv] (
        [Id]          INT IDENTITY(1,1) NOT NULL,
        [OpDate]      DATE          NOT NULL,          -- 記錄日期
        [RoomId]      NVARCHAR(20)  NOT NULL,          -- 白板房號 OR-xx
        [Temperature] DECIMAL(4,1)  NULL,              -- 溫度（°C，如 18.0）
        [Humidity]    DECIMAL(4,1)  NULL,              -- 溼度（%，如 62.0）
        [UpdatedAt]   DATETIME2(0) NOT NULL CONSTRAINT DF_OrRoomEnv_Upd DEFAULT(GETDATE()),
        [CreatedAt]   DATETIME2(0) NOT NULL CONSTRAINT DF_OrRoomEnv_Crt DEFAULT(GETDATE()),
        CONSTRAINT [PK_OrRoomEnv] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_OrRoomEnv_Key] UNIQUE ([OpDate],[RoomId])
    );
    CREATE INDEX IX_OrRoomEnv_OpDate ON [dbo].[OrRoomEnv] ([OpDate]);
END
GO

PRINT N'[dbo].[OrRoomEnv] 建立完成（OR 刀房每日溫溼度記錄）。';
GO
