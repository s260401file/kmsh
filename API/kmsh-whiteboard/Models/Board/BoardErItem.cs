using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Board;

/// <summary>
/// 院方 Board_ER API（急診在室清單）回應的單一病人。中文鍵、字串多補空白（含全形）取用前 trim。
/// 比 Board_bed 多回：負責醫師、醫師卡號、病患動向、檢傷分類、類別。
/// </summary>
public class BoardErItem
{
    [JsonPropertyName("病歷號")]   public string? Hhisnum { get; set; }
    [JsonPropertyName("姓名")]     public string? Hnamec { get; set; }
    [JsonPropertyName("身分證")]   public string? Hidno { get; set; }
    [JsonPropertyName("出生年月日")] public string? Hbirthdt { get; set; }
    [JsonPropertyName("性別")]     public string? Hsex { get; set; }
    [JsonPropertyName("負責醫師")] public string? Doctor { get; set; }
    [JsonPropertyName("醫師卡號")] public string? DoctorCard { get; set; }
    [JsonPropertyName("病房")]     public string? Ward { get; set; }
    [JsonPropertyName("病患動向")] public string? Flow { get; set; }     // 代碼，意義待院方確認（如 O）
    [JsonPropertyName("檢傷分類")] public string? Triage { get; set; }   // E/2/3/4/5/9（重症E,2／中症3／輕症4,5,9）
    [JsonPropertyName("類別")]     public string? Category { get; set; } // 就醫類別（E=急診）
    [JsonPropertyName("診斷")]     public string? Diagnosis { get; set; } // 院方已回傳（可帶入，免後台自建）
    [JsonPropertyName("科別")]     public string? Department { get; set; } // 院方已回傳（代碼，可帶入，免後台自建）
    [JsonPropertyName("床位")]     public string? Hbed { get; set; }
}

/// <summary>Board_ER 回應外殼：{ success, data[] }。</summary>
public class BoardErResponse
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("data")]    public List<BoardErItem> Data { get; set; } = new();
}
