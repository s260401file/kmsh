using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Staff;

/// <summary>
/// 高榮(VGHKS) HIS「組織單位」介面回應的一筆資料列。
/// 用於建立單位階層（上層單位）與顯示單位主管。
/// </summary>
public class UnitItem
{
    [JsonPropertyName("UNITCODE")]
    public string? Unitcode { get; set; }             // 單位代碼 UNITCODE

    [JsonPropertyName("UNAME")]
    public string? Uname { get; set; }                // 單位名稱 UNAME

    [JsonPropertyName("PARENT_UNITCODE")]
    public string? ParentUnitcode { get; set; }       // 上層單位代碼 PARENT_UNITCODE

    [JsonPropertyName("PARENT_NAME")]
    public string? ParentName { get; set; }           // 上層單位名稱 PARENT_NAME

    [JsonPropertyName("PE_NO_Leader")]
    public string? PeNoLeader { get; set; }           // 單位主管員工代號 PE_NO_Leader
}
