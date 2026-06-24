using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>OR 手術派班-班級人員 新增/修改請求（後台 CRUD）。</summary>
public class OrShiftStaffUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "OR";
    [Required] public string ShiftType { get; set; } = "";
    [Required] public string Role { get; set; } = "";
    public string? Name { get; set; }
    public string? RoleTitle { get; set; }
    public string? Ext { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
