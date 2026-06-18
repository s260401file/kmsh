using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Ward;

/// <summary>
/// 高榮(VGHKS) HIS「病房床位清單」介面回應的一筆資料列（一床一筆）。
/// 用於白板病室動態，呈現各床病人、病況、主治醫師與床位屬性。
/// </summary>
public class BedListItem
{
    [JsonPropertyName("hnursta")]
    public string? Hnursta { get; set; }              // 病房代碼 hnursta

    [JsonPropertyName("hbedno")]
    public string? Hbedno { get; set; }               // 床號 hbedno

    [JsonPropertyName("hhisnum")]
    public string? Hhisnum { get; set; }              // 病歷號 hhisnum

    [JsonPropertyName("hnamec")]
    public string? Hnamec { get; set; }               // 病人中文姓名 hnamec

    [JsonPropertyName("hbirthdt")]
    public string? Hbirthdt { get; set; }             // 出生日期 hbirthdt

    [JsonPropertyName("hsex")]
    public string? Hsex { get; set; }                 // 性別 hsex

    [JsonPropertyName("hpatstat")]
    public string? Hpatstat { get; set; }             // 病人狀態 hpatstat

    [JsonPropertyName("hcurdesc")]
    public string? Hcurdesc { get; set; }             // 目前科別名稱 hcurdesc

    [JsonPropertyName("emgtyp")]
    public string? Emgtyp { get; set; }               // 急診類別 emgtyp

    [JsonPropertyName("hcaseno")]
    public string? Hcaseno { get; set; }              // 住院案號 hcaseno

    [JsonPropertyName("hidno")]
    public string? Hidno { get; set; }                // 身分證字號 hidno

    [JsonPropertyName("patflag")]
    public BedPatFlag? Patflag { get; set; }          // 病況旗標（如 DNR）

    [JsonPropertyName("doctor")]
    public BedDoctor? Doctor { get; set; }            // 主治/負責醫師

    [JsonPropertyName("bedArea")]
    public string? BedArea { get; set; }              // 床位分區 bedArea

    [JsonPropertyName("bedAttribute")]
    public string? BedAttribute { get; set; }         // 床位屬性 bedAttribute
}

/// <summary>BedListItem 病況旗標子物件。</summary>
public class BedPatFlag
{
    [JsonPropertyName("dnr")]
    public string? Dnr { get; set; }                  // 不施行心肺復甦(DNR)旗標 dnr
}

/// <summary>BedListItem 醫師子物件。</summary>
public class BedDoctor
{
    [JsonPropertyName("hdocnamc")]
    public string? Hdocnamc { get; set; }             // 醫師中文姓名 hdocnamc

    [JsonPropertyName("hmdno")]
    public string? Hmdno { get; set; }                // 醫師代號 hmdno
}
