namespace kmsh_whiteboard.Models.Db;

/// <summary>檢查/會診自建一筆（W52/ICU/ER 共用，Kind 區分）。院方 OR.ORDER/RESULT 未開放前先自建。</summary>
public class WardExamConsultItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";
    public string Kind { get; set; } = "";             // 檢查 / 會診
    public string? Hhisnum { get; set; }
    public string? BedId { get; set; }
    public string? PatientName { get; set; }
    public string? Gender { get; set; }
    public string? ItemName { get; set; }              // 檢查項目 或 會診科別
    public string? Doctor { get; set; }                // 會診醫師
    public string? ScheduledDate { get; set; }
    public string? TimeSlot { get; set; }
    public string? CompletedTime { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
