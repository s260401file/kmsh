using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>ICU 抗生素 新增/修改請求（後台 CRUD）。</summary>
public class IcuAntibioticUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "ICU";
    public string? Hhisnum { get; set; }
    public string? DrugName { get; set; }
    public string? StartDateTime { get; set; }
    public string? FirstDoseDateTime { get; set; }
    public string? EndDateTime { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
