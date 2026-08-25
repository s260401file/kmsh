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
    [JsonPropertyName("轉入日期")]   public string? AdmitDate { get; set; }   // 新版 API 已移除（保留相容，通常為 null）
    [JsonPropertyName("執行日期")]   public string? ExamDate { get; set; }    // 新版：檢查執行日期（ISO）
    [JsonPropertyName("執行時間")]   public string? ExamTime { get; set; }    // 新版：檢查執行時間（HH:mm）
    [JsonPropertyName("狀態")]       public string? Status { get; set; }      // ORSTATUS：68完成/64完報/31未執行/38執行中/82取消醫囑/32未排程/34已排程/62初報
    [JsonPropertyName("檢查驗名稱")] public string? ExamName { get; set; }
}

public class BoardExamineResponse
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("data")]    public List<BoardExamineItem> Data { get; set; } = new();
}
