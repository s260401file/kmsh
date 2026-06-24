using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Board;

/// <summary>
/// 院方 Board_OR API（手術排程清單）回應的單一手術。中文鍵、字串多補空白（含全形）取用前 trim。
/// 為「預定排程」：無即時手術狀態/實際起訖/刷手流動/科別（這些由自建 overlay 補）。
/// </summary>
public class BoardOrItem
{
    [JsonPropertyName("刀房")]     public string? Room { get; set; }      // R1…R7
    [JsonPropertyName("病歷號")]   public string? Hhisnum { get; set; }
    [JsonPropertyName("姓名")]     public string? Hnamec { get; set; }
    [JsonPropertyName("性別")]     public string? Hsex { get; set; }
    [JsonPropertyName("出生年月日")] public string? Hbirthdt { get; set; }
    [JsonPropertyName("手術")]     public string? Surgery { get; set; }   // 術式名
    [JsonPropertyName("主刀醫師")] public string? Doctor { get; set; }
    [JsonPropertyName("麻醉")]     public string? Anes { get; set; }      // LA/SA/GA/IG/IR…
    [JsonPropertyName("來源")]     public string? Source { get; set; }    // 代碼（實測全 O，待院方代碼表）
    [JsonPropertyName("手術日期")] public string? OpDate { get; set; }    // ISO
    [JsonPropertyName("手術時間")] public string? OpTime { get; set; }    // HH:mm
    [JsonPropertyName("診斷")]     public string? Diagnosis { get; set; }
}

/// <summary>Board_OR 回應外殼：{ success, data[] }。</summary>
public class BoardOrResponse
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("data")]    public List<BoardOrItem> Data { get; set; } = new();
}
