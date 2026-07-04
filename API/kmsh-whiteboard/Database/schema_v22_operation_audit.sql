-- schema_v22_operation_audit.sql — 操作稽核
-- 規格書要求：資料之新增/修改/刪除須記錄使用者帳號與發生時間。
-- 由 OperationAuditFilter（全域 action filter）自動寫入：所有 POST/PUT/PATCH/DELETE（登入/登出除外，另有 LoginAudit）。
USE Whiteboard;
GO

IF OBJECT_ID(N'dbo.OperationAudit', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OperationAudit (
        Id          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OperationAudit PRIMARY KEY,
        EmployeeNo  NVARCHAR(20)   NULL,       -- 操作者員編（JWT sub；理論上必有，防禦性可空）
        Name        NVARCHAR(50)   NULL,       -- 操作者姓名（JWT name）
        Method      VARCHAR(10)    NOT NULL,   -- POST / PUT / PATCH / DELETE
        Path        NVARCHAR(200)  NOT NULL,   -- 端點路徑（含路由參數，如 /api/Board/ext/12）
        Body        NVARCHAR(MAX)  NULL,       -- 請求內容摘要（[FromBody] 參數 JSON，截斷 4000 字；檔案上傳不記內容）
        StatusCode  INT            NULL,       -- 回應狀態碼（2xx 成功；4xx/5xx 亦留跡）
        Ip          NVARCHAR(45)   NULL,       -- 來源 IP（IPv6 最長 45）
        CreatedAt   DATETIME2(0)   NOT NULL CONSTRAINT DF_OperationAudit_CreatedAt DEFAULT SYSDATETIME()
    );
    CREATE INDEX IX_OperationAudit_CreatedAt  ON dbo.OperationAudit (CreatedAt DESC);
    CREATE INDEX IX_OperationAudit_EmployeeNo ON dbo.OperationAudit (EmployeeNo, CreatedAt DESC);
END
GO
