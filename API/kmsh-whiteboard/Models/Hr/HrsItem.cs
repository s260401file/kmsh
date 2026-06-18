using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Hr;

/// <summary>
/// 高榮(VGHKS) HIS「人員(HR)」介面回應的一筆資料列。
/// 用於白板顯示單位人員名單與其聯絡分機/職稱。
/// </summary>
public class HrsItem
{
    [JsonPropertyName("PE_NO")]
    public string? PeNo { get; set; }                 // HIS 員工代號 PE_NO

    [JsonPropertyName("PE_NAME")]
    public string? PeName { get; set; }               // HIS 員工姓名 PE_NAME

    [JsonPropertyName("UNITCODE")]
    public string? Unitcode { get; set; }             // HIS 單位代碼 UNITCODE

    [JsonPropertyName("MVPN")]
    public string? Mvpn { get; set; }                 // HIS 行動公務電話 MVPN

    [JsonPropertyName("EXT")]
    public string? Ext { get; set; }                  // HIS 分機 EXT

    // 1=醫師 2=專科護理師 3=傳送員 4=行政護理 5=呼吸治療師 6=護理師 7=固定夜班藥師
    [JsonPropertyName("TREAT_TITLE")]
    public string? TreatTitle { get; set; }
}
