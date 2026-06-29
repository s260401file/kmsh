using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>ER 三班醫護面板 修改請求（後台只編每班的醫師/照服員/護理師）。</summary>
public class ErShiftStaffUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "ER";
    [Required] public string ShiftKey { get; set; } = "";
    public string? ShiftLabel { get; set; }
    public string? ShiftTime { get; set; }
    public string? Doctor { get; set; }
    public string? Aide { get; set; }
    public string? NurseStaffIds { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
