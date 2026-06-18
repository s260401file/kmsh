namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// 自建 SQL Server「值班聯絡人」資料表的一筆資料列。
/// 用於白板顯示各班別/時段的值班職稱與聯絡方式。
/// </summary>
public class DutyContactItem
{
    public int Id { get; set; }                       // 主鍵（流水號）
    public string UnitCode { get; set; } = "";        // 所屬單位代碼
    public string? ShiftType { get; set; }            // 班別（如白班/小夜/大夜）
    public string? TimeSlot { get; set; }             // 值班時段
    public string DutyTitle { get; set; } = "";       // 值班職稱（如值班醫師/護理長）
    public string Name { get; set; } = "";            // 值班人員姓名
    public string? Extension { get; set; }            // 分機號碼
    public string? Mobile { get; set; }               // 手機/行動電話
    public int SortOrder { get; set; }                // 顯示排序
    public bool IsActive { get; set; }                // 是否啟用
    public DateTime CreatedAt { get; set; }           // 建立時間
}
