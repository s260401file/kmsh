using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>照護提醒 新增/修改請求（後台 CRUD）。</summary>
public class CareReminderUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "W52";
    public string? BedId { get; set; }
    public string? PatientName { get; set; }
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? Priority { get; set; }
    public string? Category { get; set; }
    public string? Content { get; set; }
    public string? RemindTime { get; set; }
    public int? PrimaryNurseStaffId { get; set; }
    public bool IsDone { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
