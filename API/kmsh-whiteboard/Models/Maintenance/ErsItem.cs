using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Maintenance;

public class ErsItem
{
    [JsonPropertyName("ERS_NO")]
    public string? ErsNo { get; set; }

    [JsonPropertyName("SER_NO")]
    public int? SerNo { get; set; }

    [JsonPropertyName("PRO_NAME")]
    public string? ProName { get; set; }

    [JsonPropertyName("NAME")]
    public string? Name { get; set; }

    [JsonPropertyName("REP_PERSON")]
    public string? RepPerson { get; set; }

    [JsonPropertyName("PRC_TYPE")]
    public string? PrcType { get; set; }

    [JsonPropertyName("EXP_DATE")]
    public string? ExpDate { get; set; }

    [JsonPropertyName("ACT_DATE")]
    public string? ActDate { get; set; }

    [JsonPropertyName("REMARKS")]
    public string? Remarks { get; set; }

    // -1=退件 0=申請未送出 2=已簽核 3=處理中 4=未驗收 5=未結案 6=已結案
    [JsonPropertyName("FLAG")]
    public int? Flag { get; set; }
}
