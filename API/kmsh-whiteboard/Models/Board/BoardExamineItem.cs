using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Board;

/// <summary>
/// Board_Examine（院方檢查）查詢回應項目。POST api/v1/Board_Examine（body {}、需 x-api-key），
/// 回傳全院各病房檢查（每列一項檢查；尚無會診）。字串多補空白（含全形）→ 取出後一律 trim。
/// 病房代碼：W52＝W52、ICU＝AICU(＋CICU)、ER＝MER。狀態：31 未執行、32 未排程、34 已排程。
/// </summary>
public class BoardExamineItem
{
    [JsonPropertyName("病歷號")]     public string? Hhisnum { get; set; }
    [JsonPropertyName("姓名")]       public string? Hnamec { get; set; }
    [JsonPropertyName("急住類別")]   public string? Category { get; set; }   // A＝住院、E＝急診
    [JsonPropertyName("病房")]       public string? Ward { get; set; }
    [JsonPropertyName("床位")]       public string? Hbed { get; set; }
    [JsonPropertyName("轉入日期")]   public string? AdmitDate { get; set; }
    [JsonPropertyName("狀態")]       public string? Status { get; set; }
    [JsonPropertyName("檢查驗名稱")] public string? ExamName { get; set; }
}

public class BoardExamineResponse
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("data")]    public List<BoardExamineItem> Data { get; set; } = new();
}
