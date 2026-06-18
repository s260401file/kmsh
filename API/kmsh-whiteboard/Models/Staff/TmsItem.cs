using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Staff;

/// <summary>
/// 高榮(VGHKS) HIS「員工/人事(TMS)」介面回應的一筆資料列。
/// 用於白板顯示單位員工名單、職類、證照與到離職等資料。
/// </summary>
public class TmsItem
{
    [JsonPropertyName("PE_NO")]
    public string? PeNo { get; set; }                 // 員工代號 PE_NO

    [JsonPropertyName("PE_NAME")]
    public string? PeName { get; set; }               // 員工姓名 PE_NAME

    [JsonPropertyName("EMAIL")]
    public string? Email { get; set; }                // 電子郵件 EMAIL

    [JsonPropertyName("UNAME")]
    public string? Uname { get; set; }                // 單位名稱 UNAME

    [JsonPropertyName("UNITCODE")]
    public string? Unitcode { get; set; }             // 單位代碼 UNITCODE

    [JsonPropertyName("HR_TYPE")]
    public string? HrType { get; set; }               // 人事類別 HR_TYPE

    [JsonPropertyName("DNAME")]
    public string? Dname { get; set; }                // 部門名稱 DNAME

    [JsonPropertyName("TNAME")]
    public string? Tname { get; set; }                // 職稱名稱 TNAME

    [JsonPropertyName("LICENCE")]
    public string? Licence { get; set; }              // 證照 LICENCE

    [JsonPropertyName("MVPN")]
    public string? Mvpn { get; set; }                 // 行動公務電話 MVPN

    [JsonPropertyName("ARRIVE_DATE")]
    public string? ArriveDate { get; set; }           // 到職日期 ARRIVE_DATE

    [JsonPropertyName("LEAVE_DATE")]
    public string? LeaveDate { get; set; }            // 離職日期 LEAVE_DATE

    [JsonPropertyName("ID_NO")]
    public string? IdNo { get; set; }                 // 身分證字號 ID_NO

    [JsonPropertyName("SEX")]
    public string? Sex { get; set; }                  // 性別 SEX

    [JsonPropertyName("ATYPE")]
    public string? Atype { get; set; }                // 任用/職務類別 ATYPE

    [JsonPropertyName("BIRTH_DATE")]
    public string? BirthDate { get; set; }            // 出生日期 BIRTH_DATE
}
