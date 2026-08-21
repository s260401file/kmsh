using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Board;

/// <summary>
/// Board_Note（院方臨床註記）查詢回應項目。POST api/v1/Board_Note（body {}、需 x-api-key）。
/// 逐病人回傳洗腎／禁治療／禁食三項；以病歷號比對在床名單。字串多補空白（含全形）→ 取出後一律 trim。
/// 判定：非空白且 trim 後非 "N" 視為「是」（洗腎「Y」/「N」；禁治療 null／值；禁食 null／NPO 文字）。
/// 用於 W52／ICU 病室動態底部「洗腎／禁治療／禁食」徽章（院方為主、後台為輔）。
/// </summary>
public class BoardNoteItem
{
    [JsonPropertyName("病歷號")]     public string? Hhisnum { get; set; }
    [JsonPropertyName("姓名")]       public string? Hnamec { get; set; }
    [JsonPropertyName("病房")]       public string? Ward { get; set; }
    [JsonPropertyName("床位")]       public string? Hbed { get; set; }
    [JsonPropertyName("洗腎註記")]   public string? Dialysis { get; set; }   // "Y"／"N"
    [JsonPropertyName("禁治療註記")] public string? NoTreat { get; set; }    // null 或值
    [JsonPropertyName("禁食註記")]   public string? Npo { get; set; }        // null 或 NPO 文字
}

public class BoardNoteResponse
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("data")]    public List<BoardNoteItem> Data { get; set; } = new();
}
