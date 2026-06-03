using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Common;

public class VghksApiResponse<T>
{
    [JsonPropertyName("success")]
    public string? Success { get; set; }

    [JsonPropertyName("msg")]
    public string? Msg { get; set; }

    [JsonPropertyName("resultList")]
    public List<T>? ResultList { get; set; }

    [JsonIgnore]
    public bool IsSuccess => "Y".Equals(Success, StringComparison.OrdinalIgnoreCase);
}
