namespace kmsh_whiteboard.Models.Db;

/// <summary>OR 手術派班-班級人員（護理長/麻醉/體循）一筆。自建，後台維護。對應 ScheduleTab。</summary>
public class OrShiftStaffItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "OR";
    public string ShiftType { get; set; } = "";        // 白班/小夜/大夜
    public string Role { get; set; } = "";             // 護理長/麻醉/體循
    public string? Name { get; set; }
    public string? RoleTitle { get; set; }             // 職稱（如「主治麻醉科醫師」）
    public string? Ext { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
