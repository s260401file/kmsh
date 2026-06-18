namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// 自建 SQL Server「疏散(撤離)圖檔」資料表的一筆資料列。
/// 用於白板「疏散撤離」面板，存放各單位上傳的疏散路線圖/平面圖。
/// </summary>
public class EvacImageItem
{
    public int Id { get; set; }                       // 主鍵（流水號）
    public string UnitCode { get; set; } = "";        // 所屬單位代碼
    public string ImagePath { get; set; } = "";       // 圖檔儲存路徑（伺服器相對/實體路徑）
    public string? OrigName { get; set; }             // 上傳時的原始檔名
    public DateTime UploadedAt { get; set; }          // 上傳時間
}
