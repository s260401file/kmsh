/* =============================================================================
   KMSH 通用看板圖片 [dbo].[BoardImage]（v32）
   -----------------------------------------------------------------------------
   以 (Kind, UnitCode) 為鍵，每種類×每站至多一張圖（檔案存 uploads/{Kind}/{UnitCode}{ext}）。
   目前用途：Kind='assist'（OR 各科協助業務）。與避難圖 [dbo].[EvacImage] 分離、不互相影響。
   冪等（OBJECT_ID 判存在）；可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[BoardImage]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BoardImage] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [Kind]       NVARCHAR(20)  NOT NULL,            -- 圖片種類，如 assist（各科協助業務）
        [UnitCode]   NVARCHAR(20)  NOT NULL,            -- 站別，如 OR
        [ImagePath]  NVARCHAR(200) NOT NULL,            -- 落地檔名（uploads/{Kind}/ 下）
        [OrigName]   NVARCHAR(200) NULL,                -- 使用者上傳時的原始檔名
        [UploadedAt] DATETIME2(0)  NOT NULL CONSTRAINT DF_BoardImage_Uploaded DEFAULT(GETDATE()),
        CONSTRAINT [PK_BoardImage] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_BoardImage] UNIQUE ([Kind],[UnitCode])
    );
END
GO

PRINT N'[dbo].[BoardImage] 通用看板圖片表建立完成。';
GO
