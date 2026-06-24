namespace kmsh_whiteboard.Models.Db;

/// <summary>ICU 抗生素自建一筆（以病歷號 Hhisnum 掛載）。院方 UD.UDORDER 未開放前先自建。</summary>
public class IcuAntibioticItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "ICU";
    public string? Hhisnum { get; set; }               // 病歷號（對應在床病人）
    public string? DrugName { get; set; }              // 藥品名稱
    public string? StartDateTime { get; set; }         // 開始時間（yyyy-MM-dd HH:mm）
    public string? FirstDoseDateTime { get; set; }     // 首次給藥時間
    public string? EndDateTime { get; set; }           // 結束時間
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
