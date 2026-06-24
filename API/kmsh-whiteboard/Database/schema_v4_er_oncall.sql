/* =============================================================================
   KMSH ER 各科值班醫師 [dbo].[ErOnCallDoctor]（v4）
   -----------------------------------------------------------------------------
   對應實體急診白板右半「各科值班醫師」；一科一列，後台維護當日值班醫師/分機/員編。
   白板病室動態以 5×2 面板顯示（MER09 下方 col7-11×row7-8）。可重複執行。
   ============================================================================= */
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'[dbo].[ErOnCallDoctor]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ErOnCallDoctor] (
        [Id]         INT IDENTITY(1,1) NOT NULL,
        [UnitCode]   NVARCHAR(20)  NOT NULL,
        [DeptCode]   NVARCHAR(20)  NOT NULL,   -- MED/GS/ORTH/NS/GYN/PS/PED/CRS/GU/CVS…
        [DeptName]   NVARCHAR(50)  NULL,
        [DoctorName] NVARCHAR(50)  NULL,
        [Ext]        NVARCHAR(20)  NULL,
        [EmpNo]      NVARCHAR(20)  NULL,
        [SortOrder]  INT NOT NULL CONSTRAINT DF_EOC_Sort     DEFAULT(0),
        [IsActive]   BIT NOT NULL CONSTRAINT DF_EOC_IsActive DEFAULT(1),
        [UpdatedAt]  DATETIME2(0) NOT NULL CONSTRAINT DF_EOC_Updated DEFAULT(GETDATE()),
        [CreatedAt]  DATETIME2(0) NOT NULL CONSTRAINT DF_EOC_Created DEFAULT(GETDATE()),
        CONSTRAINT [PK_ErOnCallDoctor] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [UX_ErOnCallDoctor_Unit_Dept] UNIQUE ([UnitCode],[DeptCode])
    );
END
GO

/* 種子：10 科（依實體急診白板右半 mock）。已存在則略過。 */
MERGE [dbo].[ErOnCallDoctor] AS t
USING (VALUES
  ('ER','MED', N'內科',        N'李呂華',  N'',     N'',         10),
  ('ER','GS',  N'一般外科',    N'Dr.Li',   N'4204', N'0011064',  20),
  ('ER','ORTH',N'骨科',        N'Dr.Wang', N'5558', N'0011180',  30),
  ('ER','NS',  N'神經外科',    N'Dr.Chen', N'6365', N'0011149',  40),
  ('ER','GYN', N'婦產科',      N'Dr.Chen', N'2226', N'0009831',  50),
  ('ER','PS',  N'整形外科',    N'Dr.Lin',  N'1621', N'0011077',  60),
  ('ER','PED', N'小兒科',      N'曹○○',   N'',     N'',         70),
  ('ER','CRS', N'大腸直腸外科',N'Dr.Wang', N'',     N'0011238',  80),
  ('ER','GU',  N'泌尿科',      N'Dr.Tsai', N'',     N'0011153',  90),
  ('ER','CVS', N'心臟血管外科',N'王鈺棠',  N'',     N'',        100)
) AS s (UnitCode,DeptCode,DeptName,DoctorName,Ext,EmpNo,SortOrder)
ON (t.UnitCode=s.UnitCode AND t.DeptCode=s.DeptCode)
WHEN NOT MATCHED THEN
  INSERT (UnitCode,DeptCode,DeptName,DoctorName,Ext,EmpNo,SortOrder,IsActive,UpdatedAt,CreatedAt)
  VALUES (s.UnitCode,s.DeptCode,s.DeptName,s.DoctorName,s.Ext,s.EmpNo,s.SortOrder,1,GETDATE(),GETDATE());
GO

PRINT N'[dbo].[ErOnCallDoctor] 建立完成並植入 10 科 mock 種子。';
GO
