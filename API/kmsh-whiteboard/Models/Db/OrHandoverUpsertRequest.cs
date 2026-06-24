using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>OR 術後特殊交班 新增/修改請求（後台 CRUD）。</summary>
public class OrHandoverUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "OR";
    public string? Hhisnum { get; set; }
    public string? RoomId { get; set; }
    public string? PatientName { get; set; }
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? SurgeryName { get; set; }
    public string? SurgerySource { get; set; }
    public string? SurgeonName { get; set; }
    public string? DestWard { get; set; }
    public string? DestBed { get; set; }
    public string? EndTime { get; set; }
    public int? BloodLoss { get; set; }
    public int? BloodTransfusion { get; set; }
    public string? DrainDetails { get; set; }
    public string? SpecialNotes { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
