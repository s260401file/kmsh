namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// 自建「ER 床位主檔」一筆（一床一列，以 UnitCode＋BedId 為鍵）。
/// 存床碼＋分區＋平面圖座標(GridCol/GridRow)，供 ER 病室動態照主檔擺床、顯示空床；
/// Board_ER 在室病人以 bedId merge 上去。後台可增刪改（待院方完整床位清單）。
/// </summary>
public class ErBedItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";       // 固定 ER
    public string BedId { get; set; } = "";           // 白板床號（MER07 / 負2 / OER01 / MER991）
    public string? Ward { get; set; }                 // 病房前綴（MER/OER/負…）
    public string? Zone { get; set; }                 // 分區
    public int? GridCol { get; set; }                 // 平面圖 grid-column
    public int? GridRow { get; set; }                 // 平面圖 grid-row
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
