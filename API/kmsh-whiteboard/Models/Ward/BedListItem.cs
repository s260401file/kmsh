using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Ward;

public class BedListItem
{
    [JsonPropertyName("hnursta")]
    public string? Hnursta { get; set; }

    [JsonPropertyName("hbedno")]
    public string? Hbedno { get; set; }

    [JsonPropertyName("hhisnum")]
    public string? Hhisnum { get; set; }

    [JsonPropertyName("hnamec")]
    public string? Hnamec { get; set; }

    [JsonPropertyName("hbirthdt")]
    public string? Hbirthdt { get; set; }

    [JsonPropertyName("hsex")]
    public string? Hsex { get; set; }

    [JsonPropertyName("hpatstat")]
    public string? Hpatstat { get; set; }

    [JsonPropertyName("hcurdesc")]
    public string? Hcurdesc { get; set; }

    [JsonPropertyName("emgtyp")]
    public string? Emgtyp { get; set; }

    [JsonPropertyName("hcaseno")]
    public string? Hcaseno { get; set; }

    [JsonPropertyName("hidno")]
    public string? Hidno { get; set; }

    [JsonPropertyName("patflag")]
    public BedPatFlag? Patflag { get; set; }

    [JsonPropertyName("doctor")]
    public BedDoctor? Doctor { get; set; }

    [JsonPropertyName("bedArea")]
    public string? BedArea { get; set; }

    [JsonPropertyName("bedAttribute")]
    public string? BedAttribute { get; set; }
}

public class BedPatFlag
{
    [JsonPropertyName("dnr")]
    public string? Dnr { get; set; }
}

public class BedDoctor
{
    [JsonPropertyName("hdocnamc")]
    public string? Hdocnamc { get; set; }

    [JsonPropertyName("hmdno")]
    public string? Hmdno { get; set; }
}
