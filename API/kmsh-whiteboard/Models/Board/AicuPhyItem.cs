using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Board;

/// <summary>
/// AICUPHY（AICU 病人身體約束）查詢回應項目。院方 API POST api/v1/AICUPHY（body {}、需 x-api-key），
/// 目前僅回病房＝AICU（4F）在床病人。字串多補空白（含全形）→ 取出後一律 trim。
/// </summary>
public class AicuPhyItem
{
    [JsonPropertyName("病歷號")]   public string? Hhisnum { get; set; }
    [JsonPropertyName("姓名")]     public string? Hnamec { get; set; }
    [JsonPropertyName("病房")]     public string? Ward { get; set; }
    [JsonPropertyName("床位")]     public string? Hbed { get; set; }
    [JsonPropertyName("約束註記")] public string? Restraint { get; set; }   // Y / N
}

public class AicuPhyResponse
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("data")]    public List<AicuPhyItem> Data { get; set; } = new();
}
