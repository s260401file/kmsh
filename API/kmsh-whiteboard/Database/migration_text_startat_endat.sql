/* =============================================================================
   遷移：為既有 [dbo].[Text] 表（跑馬燈/佈告欄）加上「顯示起迄時間」
   -----------------------------------------------------------------------------
   DB：Whiteboard（.\sqlexpress）
   用途：公告/跑馬燈可設定 StartAt~EndAt；白板僅顯示「現在落在區間內」者
        （NULL 表示該端不限）。後台管理仍可見全部（含尚未生效/已過期）。
   ⚠ 部署順序：本遷移需在「新版 API（含 StartAt/EndAt 的 TextRepository）」啟用前先執行，
      否則查詢會找不到欄位。可重複執行（COL_LENGTH 保護）。
   ============================================================================= */

SET NOCOUNT ON;
GO

IF COL_LENGTH(N'[dbo].[Text]', N'StartAt') IS NULL
    ALTER TABLE [dbo].[Text] ADD [StartAt] DATETIME2(0) NULL;
GO

IF COL_LENGTH(N'[dbo].[Text]', N'EndAt') IS NULL
    ALTER TABLE [dbo].[Text] ADD [EndAt] DATETIME2(0) NULL;
GO

-- 欄位 memo（SSMS 描述；已存在則略過）
IF NOT EXISTS (SELECT 1 FROM sys.extended_properties
               WHERE major_id = OBJECT_ID(N'[dbo].[Text]') AND minor_id = COLUMNPROPERTY(OBJECT_ID(N'[dbo].[Text]'), N'StartAt', 'ColumnId') AND name = N'MS_Description')
    EXEC sys.sp_addextendedproperty N'MS_Description', N'顯示起始時間（null=不限）；白板僅顯示現在落在 [StartAt,EndAt] 內者',
         N'SCHEMA', N'dbo', N'TABLE', N'Text', N'COLUMN', N'StartAt';
GO

IF NOT EXISTS (SELECT 1 FROM sys.extended_properties
               WHERE major_id = OBJECT_ID(N'[dbo].[Text]') AND minor_id = COLUMNPROPERTY(OBJECT_ID(N'[dbo].[Text]'), N'EndAt', 'ColumnId') AND name = N'MS_Description')
    EXEC sys.sp_addextendedproperty N'MS_Description', N'顯示截止時間（null=不限）',
         N'SCHEMA', N'dbo', N'TABLE', N'Text', N'COLUMN', N'EndAt';
GO

PRINT N'[dbo].[Text] 已加入 StartAt / EndAt 欄位。';
GO
