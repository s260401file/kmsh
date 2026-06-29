namespace kmsh_whiteboard.Models.Db;

/// <summary>ER「三班醫護人員」面板一班（固定四班：大夜/白班/小夜/第四班）。
/// 醫師/照服員自由文字；護理師掛人員管理 Staff.Id（逗號分隔）。</summary>
public class ErShiftStaffItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "ER";
    public string ShiftKey { get; set; } = "";          // night/day/evening/noon
    public string? ShiftLabel { get; set; }             // 大夜/白班/小夜（第四班空）
    public string? ShiftTime { get; set; }
    public string? Doctor { get; set; }
    public string? Aide { get; set; }
    public string? NurseStaffIds { get; set; }          // 護理師 Staff.Id（CSV）
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
