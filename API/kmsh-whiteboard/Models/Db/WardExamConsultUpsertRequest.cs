using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>檢查/會診 新增/修改請求（後台 CRUD）。</summary>
public class WardExamConsultUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "";
    [Required] public string Kind { get; set; } = "檢查";
    public string? Hhisnum { get; set; }
    public string? BedId { get; set; }
    public string? PatientName { get; set; }
    public string? Gender { get; set; }
    public string? ItemName { get; set; }
    public string? Doctor { get; set; }
    public string? ScheduledDate { get; set; }
    public string? TimeSlot { get; set; }
    public string? CompletedTime { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
