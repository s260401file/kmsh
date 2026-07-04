-- schema_v21_login_audit : login audit (auditable per 2026-07-02 meeting)
-- AD/LDAP per-person account + login/logout logging. Records each login(success/fail)/logout.
-- ASCII-only comments (avoid sqlcmd -i codepage mangling). Idempotent.
IF OBJECT_ID('dbo.LoginAudit') IS NULL
BEGIN
    CREATE TABLE [dbo].[LoginAudit] (
        [Id]         BIGINT IDENTITY(1,1) NOT NULL,
        [EmployeeNo] NVARCHAR(20)  NULL,
        [Success]    BIT           NOT NULL,
        [Event]      NVARCHAR(10)  NOT NULL,   -- login / logout
        [Ip]         NVARCHAR(50)  NULL,
        [CreatedAt]  DATETIME2(0)  NOT NULL CONSTRAINT DF_LoginAudit_CreatedAt DEFAULT(GETDATE()),
        CONSTRAINT [PK_LoginAudit] PRIMARY KEY CLUSTERED ([Id])
    );
    CREATE INDEX IX_LoginAudit_Created ON [dbo].[LoginAudit] (CreatedAt DESC);
    CREATE INDEX IX_LoginAudit_Emp ON [dbo].[LoginAudit] (EmployeeNo, CreatedAt DESC);
END
GO
