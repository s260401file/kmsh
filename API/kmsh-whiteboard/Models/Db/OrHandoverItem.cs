namespace kmsh_whiteboard.Models.Db;

/// <summary>OR 術後特殊交班 一筆。內容源自流動護理師護理紀錄（手填，OPORDER 未開放）。對應 HandoverTab。</summary>
public class OrHandoverItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "OR";
    public string? Hhisnum { get; set; }               // 病歷號
    public string? RoomId { get; set; }
    public string? PatientName { get; set; }
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? SurgeryName { get; set; }
    public string? SurgerySource { get; set; }         // 急診刀/門診刀/住院刀
    public string? SurgeonName { get; set; }
    public string? DestWard { get; set; }              // 術後轉往病房
    public string? DestBed { get; set; }
    public string? EndTime { get; set; }               // 結束時間（null=進行中）
    public int? BloodLoss { get; set; }                // 出血 mL
    public int? BloodTransfusion { get; set; }         // 輸血 單位
    public string? DrainDetails { get; set; }
    public string? SpecialNotes { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
