using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Hr;

/// <summary>
/// 高榮(VGHKS) HIS「人員班表(UAS)」介面回應的一筆資料列。
/// 用於白板顯示單位人員每日上/下班時段與班別職稱。
/// </summary>
public class UasItem
{
    [JsonPropertyName("HEAD_MONTH")]
    public string? HeadMonth { get; set; }            // 班表月份 HEAD_MONTH

    [JsonPropertyName("UNITCODE")]
    public string? Unitcode { get; set; }             // HIS 單位代碼 UNITCODE

    [JsonPropertyName("PE_NO")]
    public string? PeNo { get; set; }                 // HIS 員工代號 PE_NO

    [JsonPropertyName("PE_NAME")]
    public string? PeName { get; set; }               // HIS 員工姓名 PE_NAME

    [JsonPropertyName("DATE1")]
    public string? Date1 { get; set; }                // 班表日期 DATE1

    [JsonPropertyName("CNO")]
    public string? Cno { get; set; }                  // 班別代碼 CNO

    [JsonPropertyName("NAME")]
    public string? Name { get; set; }                 // 班別名稱 NAME

    [JsonPropertyName("ON_TIME1")]
    public string? OnTime1 { get; set; }              // 第一段上班時間

    [JsonPropertyName("OFF_TIME1")]
    public string? OffTime1 { get; set; }             // 第一段下班時間

    [JsonPropertyName("ON_TIME2")]
    public string? OnTime2 { get; set; }              // 第二段上班時間

    [JsonPropertyName("OFF_TIME2")]
    public string? OffTime2 { get; set; }             // 第二段下班時間

    [JsonPropertyName("TREAT_TITLE")]
    public string? TreatTitle { get; set; }           // 職類/職稱代碼 TREAT_TITLE
}
