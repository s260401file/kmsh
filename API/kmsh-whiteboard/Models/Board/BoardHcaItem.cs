using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Board;

/// <summary>
/// Board_HCA（院方策盟註記）查詢回應項目。POST api/v1/Board_HCA（body {}、需 x-api-key）。
/// 策盟＝策略聯盟機構（護理之家／養護）；策盟註記 ≠ "0"（且非空）＝ 自該機構轉入，其值即來源機構名。
/// 字串多補空白（含全形）→ 取出後一律 trim。用於 ER 病室動態「轉入」。
/// </summary>
public class BoardHcaItem
{
    [JsonPropertyName("病歷號")]   public string? Hhisnum { get; set; }
    [JsonPropertyName("姓名")]     public string? Hnamec { get; set; }
    [JsonPropertyName("病房")]     public string? Ward { get; set; }
    [JsonPropertyName("床位")]     public string? Hbed { get; set; }
    [JsonPropertyName("策盟註記")] public string? HcaMark { get; set; }   // "0"＝否；其他＝來源機構名（轉入）
}

public class BoardHcaResponse
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("data")]    public List<BoardHcaItem> Data { get; set; } = new();
}
