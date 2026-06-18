using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Ward;

/// <summary>
/// 高榮(VGHKS) HIS「病房(護理站)清單」介面回應的一筆資料列。
/// 用於白板病房選單，對應病房代碼與護理站名稱。
/// </summary>
public class HnurstaItem
{
    [JsonPropertyName("hnursta")]
    public string? Hnursta { get; set; }              // 病房/護理站代碼 hnursta

    [JsonPropertyName("hnnsname")]
    public string? Hnnsname { get; set; }             // 護理站名稱 hnnsname
}
