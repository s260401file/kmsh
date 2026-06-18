namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// 自建 SQL Server「文字公告/佈告」資料表的一筆資料列。
/// 用於白板公告、跑馬燈或佈告欄文字的顯示與管理。
/// </summary>
public class TextItem
{
    public int Id { get; set; }                       // 主鍵（流水號）
    public string? Title { get; set; }                // 標題
    public string Content { get; set; } = "";         // 內文
    public string? Category { get; set; }             // 分類（如公告/跑馬燈/佈告欄）
    public string? UnitCode { get; set; }             // 所屬單位代碼（全院公告可空）
    public string? Priority { get; set; }             // 優先度（如一般/重要）
    public int SortOrder { get; set; }                // 顯示排序
    public bool IsActive { get; set; }                // 是否啟用
    public DateTime? StartAt { get; set; }            // 顯示起始時間（null=不限）；白板僅顯示「現在落在 [StartAt, EndAt] 內」者
    public DateTime? EndAt { get; set; }              // 顯示截止時間（null=不限）
    public DateTime CreatedAt { get; set; }           // 建立時間
    public DateTime UpdatedAt { get; set; }           // 最後更新時間
}
