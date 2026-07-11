namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// OR 當日手術快照一筆（累積）。Board_OR 完成後從清單消失 → 本表記住當日每台刀，
/// 消失者 Completed=1（視為已完成）。供 GetOr/GetOrSurgeries 讀取以穩定當日總刀數。
/// </summary>
public class OrDailySurgeryItem
{
    public int Id { get; set; }
    public DateTime SurgeryDate { get; set; }
    public string Hhisnum { get; set; } = "";
    public string? ApiRoom { get; set; }
    public string? RoomId { get; set; }
    public string? PatientName { get; set; }
    public string? Gender { get; set; }
    public string? BirthDate { get; set; }
    public string? SurgeryName { get; set; }
    public string? Doctor { get; set; }
    public string? Department { get; set; }   // 科別代碼（Board_OR 提供，如 PS）
    public string? AnesType { get; set; }
    public string? Source { get; set; }
    public string OpTime { get; set; } = "";
    public string? Diagnosis { get; set; }
    public bool Completed { get; set; }
    public DateTime FirstSeenAt { get; set; }
    public DateTime LastSeenAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
