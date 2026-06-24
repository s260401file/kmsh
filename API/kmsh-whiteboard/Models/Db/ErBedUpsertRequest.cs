using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>ER 床位主檔 新增/修改請求（後台 CRUD）。以 UnitCode＋BedId 識別床位。</summary>
public class ErBedUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "ER";
    [Required] public string BedId { get; set; } = "";
    public string? Ward { get; set; }
    public string? Zone { get; set; }
    public int? GridCol { get; set; }
    public int? GridRow { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
