namespace WhiteboardSync.Jobs;

/// <summary>
/// 10 個院方 Board_* endpoint 的快照設定（SQL 逐字取自 Document/05-SQL查詢/）。
/// 分頻：high＝約 1 分（即時性最高）；mid＝約 3 分。Endpoint 鍵沿用 API 路徑名，供白板 API 對應還原。
/// 檢查(Board_Examine)僅同步白板會用到的病房（W52/AICU/CICU）。
/// </summary>
public static class SnapshotJobs
{
    public static IEnumerable<SnapshotJob> All()
    {
        yield return new SnapshotJob("Board_bed",      "high", Sql_Board_bed);
        yield return new SnapshotJob("Board_ER",       "high", Sql_Board_ER);
        yield return new SnapshotJob("Board_ER_TypeE", "high", Sql_Board_ER_TypeE);
        yield return new SnapshotJob("OR_SYSTEM",      "high", Sql_OR_SYSTEM);
        yield return new SnapshotJob("Board_OR",       "mid",  Sql_Board_OR);
        yield return new SnapshotJob("AICUPHY",        "mid",  Sql_AICUPHY);
        yield return new SnapshotJob("Board_Examine",  "mid",  Sql_Board_Examine);
        yield return new SnapshotJob("Board_AICUUD",   "mid",  Sql_Board_AICUUD);
        yield return new SnapshotJob("Board_HCA",      "mid",  Sql_Board_HCA);
        yield return new SnapshotJob("Board_Note",     "mid",  Sql_Board_Note);
    }

    // ── 電子白板_病床資料 → Board_bed ──
    private const string Sql_Board_bed = @"
WITH CURRENT_INPATIENT AS (
    SELECT loc.[HHISNUM], loc.[HCASENO], loc.[HCASETYP], loc.[HNURSTA], loc.[HBED], loc.[HADATE], loc.[HATIME], cas.[HPATSTAT],
        FIRST_VALUE(loc.[HADATE]) OVER (PARTITION BY loc.[HCASENO] ORDER BY loc.[HADATE] ASC, loc.[HATIME] ASC) AS FIRST_HADATE,
        ROW_NUMBER() OVER (PARTITION BY loc.[HCASENO] ORDER BY loc.[HADATE] DESC, loc.[HATIME] DESC) AS rn_bed
    FROM [DB2_DUMP].[AM].[HLOC_4A0] loc
    INNER JOIN [DB2_DUMP].[AM].[HCASE_4A0] cas ON loc.[HCASENO] = cas.[HCASENO]
    WHERE cas.[HPATSTAT] IN ('A','C','I','M','O') AND loc.[HCASETYP] = 'A'
),
DOCTOR AS (
    SELECT [HHISNUM], [HMDNO], [HDOCNAMC],
        ROW_NUMBER() OVER (PARTITION BY [HHISNUM] ORDER BY [HDOCDATE] DESC, [HDOCTIME] DESC) AS rn_doc
    FROM [DB2_DUMP].[AM].[HDOCTOR_4A0]
    WHERE [HMDNO] LIKE 'MB%' OR [HMDNO] LIKE 'MC%' OR [HMDNO] LIKE 'MU%' OR [HMDNO] LIKE 'M708%'
),
SECTION AS (
    SELECT [HCASENO], [HCURSVCL],
        ROW_NUMBER() OVER (PARTITION BY [HCASENO] ORDER BY [HSECDATE] DESC, [HSECTIME] DESC) AS rn_sec
    FROM [DB2_DUMP].[AM].[HSECTION_4A0]
)
SELECT
    MAX(a.[HHISNUM]) AS [HHISNUM], MAX(b.[HNAMEC]) AS [HNAMEC], MAX(b.[HIDNO]) AS [HIDNO],
    MAX(b.[HBIRTHDT]) AS [HBIRTHDT], MAX(b.[HSEX]) AS [HSEX], MAX(c.[HDOCNAMC]) AS [HDOCNAMC],
    MAX(a.[FIRST_HADATE]) AS [HADATE], MAX(e.[HCURSVCL]) AS [HCURSVCL], MAX(d.[HDIAGTXT]) AS [HDIAGTXT],
    MAX(a.[HPATSTAT]) AS [HPATSTAT], MAX(a.[HNURSTA]) AS [HNURSTA], MAX(a.[HBED]) AS [HBED]
FROM CURRENT_INPATIENT a
LEFT JOIN [DB2_DUMP].[AM].[HPBASIC_4A0] b ON a.[HHISNUM] = b.[HHISNUM]
LEFT JOIN DOCTOR c ON a.[HHISNUM] = c.[HHISNUM] AND c.rn_doc = 1
LEFT JOIN [DB2_DUMP].[AM].[HDIAGNOS_4A0] d ON a.[HCASENO] = d.[HCASENO]
LEFT JOIN SECTION e ON a.[HCASENO] = e.[HCASENO] AND e.rn_sec = 1
WHERE a.rn_bed = 1
GROUP BY a.[HCASENO], a.[HHISNUM], a.[HNURSTA], a.[HBED]
ORDER BY a.[HBED];";

    // ── 電子白板急診病人 → Board_ER ──
    private const string Sql_Board_ER = @"
WITH CURRENT_INPATIENT AS (
    SELECT loc.[HHISNUM], loc.[HCASENO], loc.[HCASETYP], loc.[HNURSTA], loc.[HBED], loc.[HADATE], loc.[HATIME],
        ROW_NUMBER() OVER (PARTITION BY loc.[HCASENO] ORDER BY loc.[HADATE] DESC, loc.[HATIME] DESC) AS rn_bed
    FROM [DB2_DUMP].[AM].[HLOC_4A0] loc
    INNER JOIN [DB2_DUMP].[AM].[HCASE_4A0] cas ON loc.[HCASENO] = cas.[HCASENO]
    WHERE cas.[HPATSTAT] IN ('A','C','I','M','O','1','3','4','5') AND loc.[HCASETYP] = 'E'
),
DOCTOR AS (
    SELECT [HHISNUM], [HMDNO], [HDOCNAMC],
        ROW_NUMBER() OVER (PARTITION BY [HHISNUM] ORDER BY [HDOCDATE] DESC, [HDOCTIME] DESC) AS rn_doc
    FROM [DB2_DUMP].[AM].[HDOCTOR_4A0]
    WHERE [HMDNO] LIKE 'MB%' OR [HMDNO] LIKE 'MC%' OR [HMDNO] LIKE 'MU%' OR [HMDNO] LIKE 'MV01C'
),
SECTION AS (
    SELECT [HCASENO], [HCURSVCL],
        ROW_NUMBER() OVER (PARTITION BY [HCASENO] ORDER BY [HSECDATE] DESC, [HSECTIME] DESC) AS rn_sec
    FROM [DB2_DUMP].[AM].[HSECTION_4A0]
)
SELECT
    a.[HCASENO] AS [HCASENO], a.[HHISNUM] AS [HHISNUM], MAX(b.[HNAMEC]) AS [HNAMEC], MAX(b.[HIDNO]) AS [HIDNO],
    MAX(b.[HBIRTHDT]) AS [HBIRTHDT], MAX(b.[HSEX]) AS [HSEX], MAX(c.[HDOCNAMC]) AS [HDOCNAMC],
    MAX(e.[HEMGTYPE]) AS [HEMGTYPE], MAX(e.[HPATSTAT]) AS [HPATSTAT], MAX(e.[HCASETYP]) AS [HCASETYP],
    MAX(a.[HADATE]) AS [HADATE], MAX(f.[HCURSVCL]) AS [HCURSVCL], MAX(d.[HDIAGTXT]) AS [HDIAGTXT],
    a.[HNURSTA] AS [HNURSTA], a.[HBED] AS [HBED]
FROM CURRENT_INPATIENT a
LEFT JOIN [DB2_DUMP].[AM].[HPBASIC_4A0] b ON a.[HHISNUM] = b.[HHISNUM]
LEFT JOIN DOCTOR c ON a.[HHISNUM] = c.[HHISNUM] AND c.rn_doc = 1
LEFT JOIN [DB2_DUMP].[AM].[HDIAGNOS_4A0] d ON a.[HCASENO] = d.[HCASENO]
LEFT JOIN [DB2_DUMP].[AM].[HCASE_4A0] e ON a.[HCASENO] = e.[HCASENO]
LEFT JOIN SECTION f ON a.[HCASENO] = f.[HCASENO] AND f.rn_sec = 1
WHERE a.rn_bed = 1
GROUP BY a.[HCASENO], a.[HHISNUM], a.[HNURSTA], a.[HBED]
ORDER BY a.[HBED];";

    // ── ER當日病故 → Board_ER_TypeE ──
    private const string Sql_Board_ER_TypeE = @"
WITH CURRENT_INPATIENT AS (
    SELECT loc.[HHISNUM], loc.[HCASENO], loc.[HCASETYP], cas2.[HNURSTA], cas2.[HBED], loc.[HDISDATE], loc.[HDISTIME],
        ROW_NUMBER() OVER (PARTITION BY loc.[HCASENO] ORDER BY loc.[HDISDATE] DESC, loc.[HDISTIME] DESC) AS rn_bed
    FROM [DB2_DUMP].[AM].[HDISCHRG_4A0] loc
    INNER JOIN [DB2_DUMP].[AM].[HCASE_4A0] cas ON loc.[HCASENO] = cas.[HCASENO]
    INNER JOIN [DB2_DUMP].[AM].[HLOC_4A0] cas2 ON loc.[HCASENO] = cas2.[HCASENO]
    WHERE cas.[HPATSTAT] IN ('E','7') AND loc.[HCASETYP] = 'E' AND loc.[HDISDATE] = CONVERT(CHAR(8), GETDATE(), 112)
)
SELECT
    a.[HHISNUM] AS [HHISNUM],
    CONVERT(VARCHAR(10), a.[HDISDATE], 120) AS [HDISDATE],
    CONVERT(CHAR(5), a.[HDISTIME], 108) AS [HDISTIME],
    a.[HNURSTA] AS [HNURSTA], a.[HBED] AS [HBED]
FROM CURRENT_INPATIENT a
WHERE a.rn_bed = 1
GROUP BY a.[HHISNUM], a.[HDISDATE], a.[HDISTIME], a.[HNURSTA], a.[HBED]
ORDER BY a.[HDISDATE] DESC, a.[HBED];";

    // ── 手術系統資料 → OR_SYSTEM ──
    private const string Sql_OR_SYSTEM = @"
SELECT
    MAX(c.[OP_ROOM]) AS [OP_ROOM], op.[ORHISNUM] AS [ORHISNUM], MAX(b.[HNAMEC]) AS [HNAMEC],
    MAX(c.[COM_TIME]) AS [COM_TIME], MAX(c.[ENT_TIME]) AS [ENT_TIME], MAX(c.[CUT_TIME]) AS [CUT_TIME],
    MAX(c.[RES_TIME]) AS [RES_TIME], MAX(c.[SEND_OPT]) AS [SEND_OPT]
FROM [DB2_DUMP].[OR].[OPORDER_4A0] op
LEFT JOIN [DB2_DUMP].[AM].[HPBASIC_4A0] b ON op.ORHISNUM = b.HHISNUM
INNER JOIN [DB2_DUMP].[OPSMAIN].[LOG_4A0] c ON op.ORHISNUM = c.HIST_NO AND op.[ORREQNO] = c.[REQ_NO]
WHERE (op.[ORENDDT] = '2910-12-31'
    OR (op.[ORENDDT] <> '2910-12-31' AND (op.[ORENDDT] < op.[ORDATE] OR (op.[ORENDDT] = op.[ORDATE] AND op.[ORTIME] >= op.[ORENDTM]))))
    AND op.[ORBGNDT] >= DATEADD(DAY, -3, CONVERT(DATE, GETDATE()))
GROUP BY op.[ORHISNUM], op.[ORBGNDT], CONVERT(CHAR(5), op.[ORBGNTM], 108)
ORDER BY [CUT_TIME];";

    // ── 電子白板刀房 → Board_OR ──
    private const string Sql_Board_OR = @"
SELECT
    op.[OROPROOM] AS [OROPROOM], op.[ORHISNUM] AS [ORHISNUM], MAX(b.[HNAMEC]) AS [HNAMEC],
    MAX(b.[HSEX]) AS [HSEX], MAX(b.[HBIRTHDT]) AS [HBIRTHDT], MAX(op.[OROPNM1]) AS [OROPNM1],
    MAX(op.[ORDOCNM]) AS [ORDOCNM], MAX(op.[ORCATGY]) AS [ORCATGY], MAX(op.[OROPAMED]) AS [OROPAMED],
    MAX(op.[ORCASETP]) AS [ORCASETP], op.[ORBGNDT] AS [ORBGNDT],
    CONVERT(CHAR(5), op.[ORBGNTM], 108) AS [ORBGNTM], MAX(op.[ORDIAG]) AS [ORDIAG]
FROM [DB2_DUMP].[OR].[OPORDER_4A0] op
LEFT JOIN [DB2_DUMP].[AM].[HPBASIC_4A0] b ON op.ORHISNUM = b.HHISNUM
WHERE (op.[ORENDDT] = '2910-12-31'
    OR (op.[ORENDDT] <> '2910-12-31' AND (op.[ORENDDT] < op.[ORDATE] OR (op.[ORENDDT] = op.[ORDATE] AND op.[ORTIME] >= op.[ORENDTM]))))
    AND op.[ORBGNDT] >= DATEADD(DAY, -3, CONVERT(DATE, GETDATE()))
GROUP BY op.[OROPROOM], op.[ORHISNUM], op.[ORBGNDT], CONVERT(CHAR(5), op.[ORBGNTM], 108)
ORDER BY [ORBGNDT], [ORBGNTM];";

    // ── ICU約束 → AICUPHY ──
    private const string Sql_AICUPHY = @"
WITH CURRENT_INPATIENT AS (
    SELECT loc.[HHISNUM], loc.[HCASENO], loc.[HCASETYP], loc.[HNURSTA], loc.[HBED], loc.[HADATE], loc.[HATIME],
        ROW_NUMBER() OVER (PARTITION BY loc.[HCASENO] ORDER BY loc.[HADATE] DESC, loc.[HATIME] DESC) AS rn_bed
    FROM [DB2_DUMP].[AM].[HLOC_4A0] loc
    INNER JOIN [DB2_DUMP].[AM].[HCASE_4A0] cas ON loc.[HCASENO] = cas.[HCASENO]
    WHERE cas.[HPATSTAT] IN ('A','C','I','M','O') AND loc.[HCASETYP] = 'A'
)
SELECT
    MAX(a.[HHISNUM]) AS [HHISNUM], MAX(b.[HNAMEC]) AS [HNAMEC],
    MAX(CASE WHEN f.[TRPROCED] LIKE '%PHYSICAL RESTRAINT%' AND CAST(f.[TRBGNDT] AS DATE) = CAST(GETDATE() AS DATE) THEN 'Y' ELSE 'N' END) AS [PHYSICALRESTRAINT]
FROM CURRENT_INPATIENT a
LEFT JOIN [DB2_DUMP].[AM].[HPBASIC_4A0] b ON a.[HHISNUM] = b.[HHISNUM]
LEFT JOIN [DB2_DUMP].[AM].[HDIAGNOS_4A0] d ON a.[HCASENO] = d.[HCASENO]
LEFT JOIN [DB2_DUMP].[TR].[TRORDER_4A0] f ON a.[HCASENO] = f.[HCASENO]
WHERE a.rn_bed = 1 AND a.[HNURSTA] = 'AICU'
GROUP BY a.[HCASENO], a.[HHISNUM], a.[HNURSTA], a.[HBED]
ORDER BY a.[HBED];";

    // ── 住院病人檢查驗 → Board_Examine（僅 W52/AICU/CICU）──
    private const string Sql_Board_Examine = @"
WITH CURRENT_INPATIENT AS (
    SELECT loc.[HHISNUM], loc.[HCASENO], loc.[HCASETYP], loc.[HNURSTA], loc.[HBED], loc.[HADATE], loc.[HATIME],
        FIRST_VALUE(loc.[HADATE]) OVER (PARTITION BY loc.[HCASENO] ORDER BY loc.[HADATE] ASC, loc.[HATIME] ASC) AS FIRST_HADATE,
        ROW_NUMBER() OVER (PARTITION BY loc.[HCASENO] ORDER BY loc.[HADATE] DESC, loc.[HATIME] DESC) AS rn_bed
    FROM [DB2_DUMP].[AM].[HLOC_4A0] loc
    INNER JOIN [DB2_DUMP].[AM].[HCASE_4A0] cas ON loc.[HCASENO] = cas.[HCASENO]
    WHERE cas.[HPATSTAT] IN ('A','C','I','M','O')
)
SELECT
    a.[HHISNUM], b.[HNAMEC], a.[HCASETYP], a.[HNURSTA], a.[HBED],
    c.[ORSTATUS], c.[ORPROCED], c.[ORRCPDT],
    LEFT(CONVERT(VARCHAR(10), c.[ORRCPTM]), 5) AS [ORRCPTM]
FROM CURRENT_INPATIENT a
LEFT JOIN [DB2_DUMP].[AM].[HPBASIC_4A0] b ON a.[HHISNUM] = b.[HHISNUM]
INNER JOIN [DB2_DUMP].[OR].[ORDER_4A0] c ON a.[HHISNUM] = c.[ORHISNUM]
    AND c.[ORSTATUS] IN ('31','32','34','38','62','64','68','82')
    AND c.[OROEDT] >= a.[FIRST_HADATE]
WHERE a.rn_bed = 1
    AND a.[HNURSTA] IN ('W52','AICU','CICU')
ORDER BY a.[HBED], c.[ORSTATUS];";

    // ── 電子白板_AICU抗生素 → Board_AICUUD ──
    private const string Sql_Board_AICUUD = @"
WITH CURRENT_INPATIENT AS (
    SELECT loc.[HHISNUM], loc.[HCASENO], loc.[HCASETYP], loc.[HNURSTA], loc.[HBED], loc.[HADATE], loc.[HATIME],
        FIRST_VALUE(loc.[HADATE]) OVER (PARTITION BY loc.[HCASENO] ORDER BY loc.[HADATE] ASC, loc.[HATIME] ASC) AS FIRST_HADATE,
        ROW_NUMBER() OVER (PARTITION BY loc.[HCASENO] ORDER BY loc.[HADATE] DESC, loc.[HATIME] DESC) AS rn_bed
    FROM [DB2_DUMP].[AM].[HLOC_4A0] loc
    INNER JOIN [DB2_DUMP].[AM].[HCASE_4A0] cas ON loc.[HCASENO] = cas.[HCASENO]
    WHERE cas.[HPATSTAT] IN ('A','C','I','M','O') AND loc.[HCASETYP] = 'A'
)
SELECT DISTINCT
    a.[HHISNUM], b.[HNAMEC], a.[HNURSTA], a.[HBED],
    c.[UDRPNAME], c.[UDBGNDT], c.[UDBGNTM], c.[UDENDDT], c.[UDENDTM]
FROM CURRENT_INPATIENT a
LEFT JOIN [DB2_DUMP].[AM].[HPBASIC_4A0] b ON a.[HHISNUM] = b.[HHISNUM]
LEFT JOIN [DB2_DUMP].[UD].[UDORDER_4A0] c ON a.[HCASENO] = c.[HCASENO]
LEFT JOIN [dbo].[KMSH_institution] g ON a.[HHISNUM] = g.[HHISNUM]
WHERE a.rn_bed = 1 AND a.[HNURSTA] = 'AICU'
    AND (RIGHT('00000000' + ISNULL(CAST(c.[UDBGNDT] AS VARCHAR), ''), 8) + RIGHT('000000' + ISNULL(CAST(c.[UDBGNTM] AS VARCHAR), ''), 6))
      >= (RIGHT('00000000' + ISNULL(CAST(a.[HADATE] AS VARCHAR), ''), 8) + RIGHT('000000' + ISNULL(CAST(a.[HATIME] AS VARCHAR), ''), 6))
ORDER BY a.[HBED], c.[UDRPNAME];";

    // ── 電子白板全院策盟註記 → Board_HCA ──
    private const string Sql_Board_HCA = @"
WITH CURRENT_INPATIENT AS (
    SELECT loc.[HHISNUM], loc.[HCASENO], loc.[HCASETYP], loc.[HNURSTA], loc.[HBED], loc.[HADATE], loc.[HATIME],
        FIRST_VALUE(loc.[HADATE]) OVER (PARTITION BY loc.[HCASENO] ORDER BY loc.[HADATE] ASC, loc.[HATIME] ASC) AS FIRST_HADATE,
        ROW_NUMBER() OVER (PARTITION BY loc.[HCASENO] ORDER BY loc.[HADATE] DESC, loc.[HATIME] DESC) AS rn_bed
    FROM [DB2_DUMP].[AM].[HLOC_4A0] loc
    INNER JOIN [DB2_DUMP].[AM].[HCASE_4A0] cas ON loc.[HCASENO] = cas.[HCASENO]
    WHERE cas.[HPATSTAT] IN ('A','C','I','M','O')
)
SELECT
    MAX(a.[HHISNUM]) AS [HHISNUM], MAX(b.[HNAMEC]) AS [HNAMEC], MAX(a.[HNURSTA]) AS [HNURSTA],
    MAX(a.[HBED]) AS [HBED], ISNULL(MAX(c.INAMEC), '0') AS [INAMEC]
FROM CURRENT_INPATIENT a
LEFT JOIN [DB2_DUMP].[AM].[HPBASIC_4A0] b ON a.[HHISNUM] = b.[HHISNUM]
LEFT JOIN [dbo].[KMSH_institution] c ON a.[HHISNUM] = c.[HHISNUM]
WHERE a.rn_bed = 1
GROUP BY a.[HCASENO], a.[HHISNUM], a.[HNURSTA], a.[HBED]
ORDER BY a.[HBED];";

    // ── 洗腎禁食禁治療註記 → Board_Note ──
    private const string Sql_Board_Note = @"
WITH CURRENT_INPATIENT AS (
    SELECT loc.[HHISNUM], loc.[HCASENO], loc.[HCASETYP], loc.[HNURSTA], loc.[HBED], loc.[HADATE], loc.[HATIME],
        FIRST_VALUE(loc.[HADATE]) OVER (PARTITION BY loc.[HCASENO] ORDER BY loc.[HADATE] ASC, loc.[HATIME] ASC) AS FIRST_HADATE,
        ROW_NUMBER() OVER (PARTITION BY loc.[HCASENO] ORDER BY loc.[HADATE] DESC, loc.[HATIME] DESC) AS rn_bed
    FROM [DB2_DUMP].[AM].[HLOC_4A0] loc
    INNER JOIN [DB2_DUMP].[AM].[HCASE_4A0] cas ON loc.[HCASENO] = cas.[HCASENO]
    WHERE cas.[HPATSTAT] IN ('A','C','I','M','O')
)
SELECT
    MAX(a.[HHISNUM]) AS [HHISNUM], MAX(b.[HNAMEC]) AS [HNAMEC], MAX(a.[HNURSTA]) AS [HNURSTA], MAX(a.[HBED]) AS [HBED],
    MAX(CASE WHEN f.[TRPROCED] LIKE '%HD%' THEN 'Y' ELSE 'N' END) AS [HD],
    MAX(CASE WHEN f.[TRPROCED] LIKE '%禁治療%' THEN f.[TRPROCED] ELSE NULL END) AS [禁治療],
    MAX(CASE WHEN f.[TRPROCED] LIKE '%NPO%'
        AND (CONCAT(COALESCE(f.[TRENDDT], ''), COALESCE(f.[TRENDTM], '')) = ''
             OR CONCAT(f.[TRENDDT], f.[TRENDTM]) >= CONVERT(VARCHAR(8), GETDATE(), 112) + REPLACE(CONVERT(VARCHAR(8), GETDATE(), 108), ':', ''))
        THEN f.[TRPROCED] ELSE NULL END) AS [禁食]
FROM CURRENT_INPATIENT a
LEFT JOIN [DB2_DUMP].[AM].[HPBASIC_4A0] b ON a.[HHISNUM] = b.[HHISNUM]
LEFT JOIN [DB2_DUMP].[AM].[HDIAGNOS_4A0] d ON a.[HCASENO] = d.[HCASENO]
LEFT JOIN [DB2_DUMP].[TR].[TRORDER_4A0] f ON a.[HCASENO] = f.[HCASENO]
WHERE a.rn_bed = 1
GROUP BY a.[HCASENO], a.[HHISNUM], a.[HNURSTA], a.[HBED]
ORDER BY a.[HBED];";
}
