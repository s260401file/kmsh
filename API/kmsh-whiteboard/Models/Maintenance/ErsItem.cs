using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Maintenance;

/// <summary>
/// 高榮(VGHKS) HIS「設備報修/維修(ERS)」介面回應的一筆資料列。
/// 用於白板顯示單位報修案件的進度與處理狀態。
/// </summary>
public class ErsItem
{
    [JsonPropertyName("ERS_NO")]
    public string? ErsNo { get; set; }                // 報修單號 ERS_NO

    [JsonPropertyName("SER_NO")]
    public int? SerNo { get; set; }                   // 序號 SER_NO

    [JsonPropertyName("PRO_NAME")]
    public string? ProName { get; set; }              // 設備/品項名稱 PRO_NAME

    [JsonPropertyName("NAME")]
    public string? Name { get; set; }                 // 報修項目名稱 NAME

    [JsonPropertyName("REP_PERSON")]
    public string? RepPerson { get; set; }            // 報修人 REP_PERSON

    [JsonPropertyName("PRC_TYPE")]
    public string? PrcType { get; set; }              // 處理類別 PRC_TYPE

    [JsonPropertyName("EXP_DATE")]
    public string? ExpDate { get; set; }              // 預計完成日期 EXP_DATE

    [JsonPropertyName("ACT_DATE")]
    public string? ActDate { get; set; }              // 實際完成日期 ACT_DATE

    [JsonPropertyName("REMARKS")]
    public string? Remarks { get; set; }              // 備註 REMARKS

    // -1=退件 0=申請未送出 2=已簽核 3=處理中 4=未驗收 5=未結案 6=已結案
    [JsonPropertyName("FLAG")]
    public int? Flag { get; set; }
}
