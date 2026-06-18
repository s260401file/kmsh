namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// 自建 SQL Server「常用聯絡電話」資料表的一筆資料列。
/// 用於白板「聯絡資訊」面板，顯示各單位常用分機。
/// </summary>
public class CommonContactItem
{
    public int Id { get; set; }                       // 主鍵（流水號）
    public string UnitCode { get; set; } = "";        // 所屬單位代碼（病房/單位）
    public string Name { get; set; } = "";            // 聯絡對象名稱（單位或人員）
    public string Extension { get; set; } = "";       // 分機號碼
    public int SortOrder { get; set; }                // 顯示排序
    public bool IsActive { get; set; }                // 是否啟用（軟刪除/顯示控制）
}
