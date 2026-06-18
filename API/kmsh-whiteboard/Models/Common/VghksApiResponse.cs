using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Common;

/// <summary>
/// 高榮(VGHKS) HIS API 的通用回應外殼（泛型）。
/// 多數 VGHKS 介面皆回傳 success/msg + resultList 結構，T 為實際資料列型別。
/// </summary>
public class VghksApiResponse<T>
{
    [JsonPropertyName("success")]
    public string? Success { get; set; }              // 是否成功：通常為 "Y"/"N"

    [JsonPropertyName("msg")]
    public string? Msg { get; set; }                  // 回應訊息（錯誤時為失敗原因）

    [JsonPropertyName("resultList")]
    public List<T>? ResultList { get; set; }          // 資料列集合（泛型 T）

    // 便捷判斷：Success 為 "Y"（不分大小寫）即視為成功，序列化時忽略
    [JsonIgnore]
    public bool IsSuccess => "Y".Equals(Success, StringComparison.OrdinalIgnoreCase);
}
