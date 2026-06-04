using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

public class DutyContactUpsertRequest
{
    [Required]
    public string UnitCode { get; set; } = "";
    public string? ShiftType { get; set; }
    public string? TimeSlot { get; set; }
    [Required]
    public string DutyTitle { get; set; } = "";
    [Required]
    public string Name { get; set; } = "";
    public string? Extension { get; set; }
    public string? Mobile { get; set; }
    public int SortOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}
