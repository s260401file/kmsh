using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Patient;

public class AmdrCaseResponse
{
    [JsonPropertyName("success")]
    public string? Success { get; set; }

    [JsonPropertyName("msg")]
    public string? Msg { get; set; }

    [JsonPropertyName("amdrCase")]
    public AmdrCase? AmdrCase { get; set; }

    // AMPat 額外欄位
    [JsonPropertyName("udhcpats")]
    public List<AllergyItem>? Udhcpats { get; set; }

    [JsonPropertyName("diagnoslst")]
    public List<DiagnosItem>? Diagnoslst { get; set; }

    [JsonIgnore]
    public bool IsSuccess => "Y".Equals(Success, StringComparison.OrdinalIgnoreCase);
}

public class AllergyItem
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("descriptione")]
    public string? Descriptione { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("dilation")]
    public string? Dilation { get; set; }

    [JsonPropertyName("adr_desc")]
    public string? AdrDesc { get; set; }

    [JsonPropertyName("adr_dilation")]
    public string? AdrDilation { get; set; }
}

public class DiagnosItem
{
    [JsonPropertyName("hdiagtxt")]
    public string? Hdiagtxt { get; set; }
}
