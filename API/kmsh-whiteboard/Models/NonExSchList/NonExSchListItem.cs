using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.NonExSchList;

public class NonExSchListItem
{
    [JsonPropertyName("chktype")]
    public string? Chktype { get; set; }       // CHK=檢查、CON=會診、OP=手術

    [JsonPropertyName("hhisnum")]
    public string? Hhisnum { get; set; }       // 病歷號

    [JsonPropertyName("hnamec")]
    public string? Hnamec { get; set; }        // 姓名

    [JsonPropertyName("hnursta")]
    public string? Hnursta { get; set; }       // 病房

    [JsonPropertyName("hbed")]
    public string? Hbed { get; set; }          // 床號

    [JsonPropertyName("orstatuschn")]
    public string? Orstatuschn { get; set; }   // 狀態（中文）

    [JsonPropertyName("ordeptc")]
    public string? Ordeptc { get; set; }       // 執行單位

    [JsonPropertyName("orproced")]
    public string? Orproced { get; set; }      // 檢查項目名稱

    [JsonPropertyName("oroedt")]
    public string? Oroedt { get; set; }        // 申請日期 yyyy-MM-dd

    [JsonPropertyName("oroetm")]
    public string? Oroetm { get; set; }        // 申請時間 HH:mm:ss

    [JsonPropertyName("orschdt")]
    public string? Orschdt { get; set; }       // 排程日期 yyyy-MM-dd

    [JsonPropertyName("orschtm")]
    public string? Orschtm { get; set; }       // 排程時間 HH:mm:ss

    [JsonPropertyName("orrcpdt")]
    public string? Orrcpdt { get; set; }       // 執行日期 yyyy-MM-dd

    [JsonPropertyName("orrcptm")]
    public string? Orrcptm { get; set; }       // 執行時間 HH:mm:ss

    [JsonPropertyName("orpfcode")]
    public string? Orpfcode { get; set; }      // 收費碼

    [JsonPropertyName("ordept")]
    public string? Ordept { get; set; }        // 執行單位代碼

    [JsonPropertyName("orstatus")]
    public string? Orstatus { get; set; }      // 醫囑狀態代碼

    [JsonPropertyName("hidno")]
    public string? Hidno { get; set; }         // 身分證字號

    [JsonPropertyName("hsex")]
    public string? Hsex { get; set; }          // 性別

    [JsonPropertyName("hbirthdt")]
    public string? Hbirthdt { get; set; }      // 出生日期
}
