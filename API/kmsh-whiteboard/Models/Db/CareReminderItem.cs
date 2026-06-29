namespace kmsh_whiteboard.Models.Db;

/// <summary>照護提醒自建一筆（W52）。床號/病人手填；責任護理師掛 Staff。院方無此操作性資料。</summary>
public class CareReminderItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "W52";
    public string? BedId { get; set; }
    public string? PatientName { get; set; }
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? Priority { get; set; }              // 高/中/低
    public string? Category { get; set; }              // 術後照護/感控/管路/跌倒防護/藥物/檢查追蹤/衛教/出院準備
    public string? Content { get; set; }
    public string? RemindTime { get; set; }            // HH:mm
    public int? PrimaryNurseStaffId { get; set; }      // 責任護理師（軟關聯 Staff.Id）
    public bool IsDone { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? PrimaryNurseName { get; set; }      // join Staff 帶入（顯示用）
}
