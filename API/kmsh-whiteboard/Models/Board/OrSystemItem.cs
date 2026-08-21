using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Board;

/// <summary>
/// 院方 OR_SYSTEM API（手術流程時間軸）回應的單一病人。中文鍵、字串多補空白（含全形）取用前 trim。
/// 提供到達等候區/進手術室/手術結束/離開四個時間點與去向(SEND_OPT)，供 OR 看板自動判定手術狀態，
/// 取代原本以書記手動登記「實際出刀房」為完成訊號的做法。時間字串格式如「2026/8/19 上午 08:43:00」。
/// </summary>
public class OrSystemItem
{
    [JsonPropertyName("手術房")]         public string? Room { get; set; }     // R{n}，實際刀房（可能與排定不同，以此為準）
    [JsonPropertyName("病歷號")]         public string? Hhisnum { get; set; }
    [JsonPropertyName("姓名")]           public string? Hnamec { get; set; }
    [JsonPropertyName("到達等候區時間")] public string? ComTime { get; set; }   // COM_TIME → 等候中
    [JsonPropertyName("進入手術室時間")] public string? EntTime { get; set; }   // ENT_TIME → 手術中
    [JsonPropertyName("手術結束時間")]   public string? CutTime { get; set; }   // CUT_TIME → 手術結束
    [JsonPropertyName("離開時間")]       public string? ResTime { get; set; }   // RES_TIME → 已離開
    [JsonPropertyName("地方")]           public string? SendOpt { get; set; }   // SEND_OPT：1恢復室 2等候區 3加護病房
}

/// <summary>OR_SYSTEM 回應外殼：{ success, data[] }。</summary>
public class OrSystemResponse
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("data")]    public List<OrSystemItem> Data { get; set; } = new();
}
