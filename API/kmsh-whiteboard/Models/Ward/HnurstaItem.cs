using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Ward;

public class HnurstaItem
{
    [JsonPropertyName("hnursta")]
    public string? Hnursta { get; set; }

    [JsonPropertyName("hnnsname")]
    public string? Hnnsname { get; set; }
}
