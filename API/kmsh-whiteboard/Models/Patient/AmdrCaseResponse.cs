using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Patient;

/// <summary>
/// 高榮(VGHKS) HIS 查詢單一病人病況(AMDR/AMPat)的回應外殼。
/// 內含 success/msg 與病人案件主體 AmdrCase，AMPat 另含過敏與診斷清單。
/// </summary>
public class AmdrCaseResponse
{
    [JsonPropertyName("success")]
    public string? Success { get; set; }              // 是否成功："Y"/"N"

    [JsonPropertyName("msg")]
    public string? Msg { get; set; }                  // 回應訊息（失敗原因）

    [JsonPropertyName("amdrCase")]
    public AmdrCase? AmdrCase { get; set; }           // 病人案件主體

    // AMPat 額外欄位
    [JsonPropertyName("udhcpats")]
    public List<AllergyItem>? Udhcpats { get; set; }  // 過敏/藥物不良反應清單（AMPat）

    [JsonPropertyName("diagnoslst")]
    public List<DiagnosItem>? Diagnoslst { get; set; } // 診斷文字清單（AMPat）

    // 便捷判斷：Success 為 "Y"（不分大小寫）即視為成功，序列化時忽略
    [JsonIgnore]
    public bool IsSuccess => "Y".Equals(Success, StringComparison.OrdinalIgnoreCase);
}

/// <summary>過敏 / 藥物不良反應(ADR)項目（AMPat 回應）。</summary>
public class AllergyItem
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }                 // 過敏類別 type

    [JsonPropertyName("descriptione")]
    public string? Descriptione { get; set; }         // 過敏描述（英文）descriptione

    [JsonPropertyName("description")]
    public string? Description { get; set; }          // 過敏描述（中文）description

    [JsonPropertyName("dilation")]
    public string? Dilation { get; set; }             // 過敏反應/症狀說明 dilation

    [JsonPropertyName("adr_desc")]
    public string? AdrDesc { get; set; }              // 藥物不良反應描述 adr_desc

    [JsonPropertyName("adr_dilation")]
    public string? AdrDilation { get; set; }          // 藥物不良反應症狀說明 adr_dilation
}

/// <summary>診斷文字項目（AMPat 回應）。</summary>
public class DiagnosItem
{
    [JsonPropertyName("hdiagtxt")]
    public string? Hdiagtxt { get; set; }             // 診斷文字 hdiagtxt
}
