namespace kmsh_whiteboard.Models.Db;

/// <summary>OR 手術清單一列（讀本地清洗表 [dbo].[OrSurgery]，欄位一對一）。</summary>
public class OrSurgeryListRow
{
    public DateTime OpDate { get; set; }          // 手術日期
    public string? OpTime { get; set; }           // 預計開始 HH:mm
    public string? Room { get; set; }             // 手術室 R1~R7/WD
    public string? RoomId { get; set; }           // 白板房號 OR-xx
    public string? CaseType { get; set; }         // 住/門/急 A/O/E
    public string? CaseTypeText { get; set; }     // 住院/門診/急診
    public string? ChartNo { get; set; }          // 病歷號
    public string? CaseNo { get; set; }           // 案號
    public string? PatientName { get; set; }
    public string? Sex { get; set; }
    public int? Age { get; set; }
    public string? SourceWard { get; set; }        // 來源病房
    public string? SourceBed { get; set; }         // 床
    public string? SurgeonNo { get; set; }         // 主刀員編
    public string? SurgeonName { get; set; }
    public string? MentorName { get; set; }        // 指導醫師
    public string? AssistantNames { get; set; }    // 助手醫師（合併）
    public string? SurgeryName { get; set; }
    public string? Anesthesia { get; set; }        // LA/SA/GA/IG/IR
    public string? NhiCodes { get; set; }          // 健保手術代碼（合併）
    public string? IcdCodes { get; set; }          // 術前診斷 ICD（合併）
    public string? StatusCode { get; set; }        // 手術狀態碼（82＝疑似取消，代碼表待院方）
    public string? CancelReason { get; set; }      // 取消/DC 原因
    public DateTime? EndDate { get; set; }
    public string? EndTime { get; set; }
    // 逐台刀覆蓋（OrSurgeryNurse，依 OpDate+RoomId+ChartNo+OpTime 合併）
    public string? ScrubNurse { get; set; }        // 刷手護理師
    public string? CircNurse { get; set; }         // 流動護理師
    public string? AnesNurse { get; set; }         // 麻醉人員
    public string? Note { get; set; }              // 備註
}

/// <summary>手術清單回應：期間＋統計＋明細。統計型別沿用 OrMonthlyStats／CodeCount。</summary>
public class OrSurgeryListResult
{
    public string From { get; set; } = "";   // yyyy-MM-dd（含）
    public string To { get; set; } = "";     // yyyy-MM-dd（含）
    public OrMonthlyStats Stats { get; set; } = new();
    public List<OrSurgeryListRow> Rows { get; set; } = new();
}
