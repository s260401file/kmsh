namespace kmsh_whiteboard.Models.Db;

public class DutyContactItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";
    public string? ShiftType { get; set; }
    public string? TimeSlot { get; set; }
    public string DutyTitle { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Extension { get; set; }
    public string? Mobile { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
