using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Hr;

public class HrsItem
{
    [JsonPropertyName("PE_NO")]
    public string? PeNo { get; set; }

    [JsonPropertyName("PE_NAME")]
    public string? PeName { get; set; }

    [JsonPropertyName("UNITCODE")]
    public string? Unitcode { get; set; }

    [JsonPropertyName("MVPN")]
    public string? Mvpn { get; set; }

    [JsonPropertyName("EXT")]
    public string? Ext { get; set; }

    // 1=醫師 2=專科護理師 3=傳送員 4=行政護理 5=呼吸治療師 6=護理師 7=固定夜班藥師
    [JsonPropertyName("TREAT_TITLE")]
    public string? TreatTitle { get; set; }
}
