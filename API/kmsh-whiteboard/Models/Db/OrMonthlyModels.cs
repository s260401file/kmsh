namespace kmsh_whiteboard.Models.Db;

/// <summary>OR 月清單一列（直接讀資訊室同步庫 OPORDER_4A0＋join 姓名/病房）。</summary>
public class OrMonthlyRow
{
    public DateTime OpDate { get; set; }          // 手術日期 ORBGNDT
    public string? OpTime { get; set; }           // 預計開始 ORBGNTM (HH:mm)
    public string? Room { get; set; }             // 手術室 OROPROOM (R1~R7/WD)
    public string? CaseType { get; set; }         // 住/門/急 ORCASETP (A/O/E)
    public string? CaseTypeText { get; set; }     // 住院/門診/急診
    public string? Anesthesia { get; set; }       // 麻醉 OROPAMED (LA/SA/GA/IG/IR)
    public string? ChartNo { get; set; }          // 病歷號 ORHISNUM
    public string? PatientName { get; set; }       // 姓名 HNAMEC
    public string? Sex { get; set; }              // 性別 HSEX
    public int? Age { get; set; }                 // 年齡（依生日與手術日算）
    public string? SourceWard { get; set; }        // 來源病房 HNURSTA
    public string? SourceBed { get; set; }         // 床 HBED
    public string? SurgeonNo { get; set; }         // 主刀員編 ORDOCNO
    public string? SurgeonName { get; set; }       // 主刀 ORDOCNM
    public string? MentorName { get; set; }        // 指導醫師 ORGUINM
    public string? AssistantNames { get; set; }    // 助手醫師（ORADRNM1~5 合併）
    public string? SurgeryName { get; set; }       // 手術名稱 OROPNM1
    public string? NhiCodes { get; set; }          // 健保手術代碼（OROPNC1~4 合併）
    public string? IcdCodes { get; set; }          // 術前診斷 ICD（OROPICD1~4 合併）
    public string? StatusCode { get; set; }        // 手術狀態碼 ORSTATUS（代碼表待院方）
    public string? CancelReason { get; set; }      // 取消/DC 原因 ORREASON
    public DateTime? EndDate { get; set; }         // 結束日期 ORENDDT
    public string? EndTime { get; set; }           // 結束時間 ORENDTM
}

/// <summary>OR 月統計彙總。</summary>
public class OrMonthlyStats
{
    public int Total { get; set; }
    public int Inpatient { get; set; }   // 住 A
    public int Outpatient { get; set; }  // 門 O
    public int Emergency { get; set; }   // 急 E
    public int Status82 { get; set; }    // 狀態碼 82（疑似取消，待確認）
    public List<CodeCount> ByRoom { get; set; } = new();     // 各刀房台數
    public List<CodeCount> ByAnesthesia { get; set; } = new(); // 各麻醉方式
    public List<CodeCount> BySurgeon { get; set; } = new();    // 各主刀醫師（前 N）
}

public class CodeCount { public string? Key { get; set; } public int Count { get; set; } }

/// <summary>月清單回應：期間＋統計＋明細。</summary>
public class OrMonthlyResult
{
    public string From { get; set; } = "";   // yyyy-MM-dd（含）
    public string To { get; set; } = "";     // yyyy-MM-dd（不含）
    public OrMonthlyStats Stats { get; set; } = new();
    public List<OrMonthlyRow> Rows { get; set; } = new();
}
