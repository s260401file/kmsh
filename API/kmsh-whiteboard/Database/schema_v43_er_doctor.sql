-- schema_v43_er_doctor.sql
-- ER 急診醫師主檔：供 ER 緊急應變編組納入醫師（後台 ER 管理→急診醫師）。
-- 欄位：姓名、科別(軟 FK → Department.Code)、分機、備註、排序、啟用。
SET NOCOUNT ON;
GO
IF OBJECT_ID(N'[dbo].[ErDoctor]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ErDoctor] (
        [Id]        INT IDENTITY(1,1) NOT NULL,
        [Name]      NVARCHAR(50)  NOT NULL,             -- 姓名
        [DeptCode]  NVARCHAR(20)  NULL,                 -- 科別代碼（軟 FK → Department.Code）
        [Ext]       NVARCHAR(50)  NULL,                 -- 分機
        [Note]      NVARCHAR(200) NULL,                 -- 備註
        [SortOrder] INT           NOT NULL CONSTRAINT DF_ErDoc_Sort   DEFAULT(0),
        [IsActive]  BIT           NOT NULL CONSTRAINT DF_ErDoc_Active DEFAULT(1),
        [UpdatedAt] DATETIME2(0)  NOT NULL CONSTRAINT DF_ErDoc_Upd    DEFAULT(GETDATE()),
        [CreatedAt] DATETIME2(0)  NOT NULL CONSTRAINT DF_ErDoc_Crt    DEFAULT(GETDATE()),
        CONSTRAINT [PK_ErDoctor] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_ErDoctor_Sort ON [dbo].[ErDoctor] ([SortOrder], [Id]);
END
GO
