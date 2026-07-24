using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Board;

/// <summary>
/// Board_AICUUD（院方 AICU 用藥/抗生素）查詢回應項目。POST api/v1/Board_AICUUD（body {}、需 x-api-key），
/// 每列一筆用藥（欄名「抗生素」實為全部用藥）。字串多補空白（含全形）→ 取出後一律 trim。
/// 由此獨立端點供看板抗生素分頁，與 Board_bed（病室動態 census）解耦。
/// </summary>
public class BoardAicuUdItem
{
    [JsonPropertyName("病歷號")]       public string? Hhisnum { get; set; }
    [JsonPropertyName("姓名")]         public string? Hnamec { get; set; }
    [JsonPropertyName("抗生素")]       public string? Drug { get; set; }        // 藥名（實為全用藥）
    [JsonPropertyName("開始執行日期")] public string? StartDate { get; set; }   // ISO
    [JsonPropertyName("開始執行時間")] public string? StartTime { get; set; }   // HH:mm:ss
    [JsonPropertyName("結束日期")]     public string? EndDate { get; set; }     // ISO
    [JsonPropertyName("結束時間")]     public string? EndTime { get; set; }     // HH:mm:ss
}

public class BoardAicuUdResponse
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("data")]    public List<BoardAicuUdItem> Data { get; set; } = new();
}
