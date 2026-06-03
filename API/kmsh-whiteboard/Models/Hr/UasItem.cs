using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Hr;

public class UasItem
{
    [JsonPropertyName("HEAD_MONTH")]
    public string? HeadMonth { get; set; }

    [JsonPropertyName("UNITCODE")]
    public string? Unitcode { get; set; }

    [JsonPropertyName("PE_NO")]
    public string? PeNo { get; set; }

    [JsonPropertyName("PE_NAME")]
    public string? PeName { get; set; }

    [JsonPropertyName("DATE1")]
    public string? Date1 { get; set; }

    [JsonPropertyName("CNO")]
    public string? Cno { get; set; }

    [JsonPropertyName("NAME")]
    public string? Name { get; set; }

    [JsonPropertyName("ON_TIME1")]
    public string? OnTime1 { get; set; }

    [JsonPropertyName("OFF_TIME1")]
    public string? OffTime1 { get; set; }

    [JsonPropertyName("ON_TIME2")]
    public string? OnTime2 { get; set; }

    [JsonPropertyName("OFF_TIME2")]
    public string? OffTime2 { get; set; }

    [JsonPropertyName("TREAT_TITLE")]
    public string? TreatTitle { get; set; }
}
