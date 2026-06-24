using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>各科值班醫師 新增/修改請求（後台 CRUD）。</summary>
public class ErOnCallDoctorUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "";
    [Required] public string DeptCode { get; set; } = "";
    public string? DeptName { get; set; }
    public string? DoctorName { get; set; }
    public string? Ext { get; set; }
    public string? EmpNo { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
