using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Staff;

public class UnitItem
{
    [JsonPropertyName("UNITCODE")]
    public string? Unitcode { get; set; }

    [JsonPropertyName("UNAME")]
    public string? Uname { get; set; }

    [JsonPropertyName("PARENT_UNITCODE")]
    public string? ParentUnitcode { get; set; }

    [JsonPropertyName("PARENT_NAME")]
    public string? ParentName { get; set; }

    [JsonPropertyName("PE_NO_Leader")]
    public string? PeNoLeader { get; set; }
}
