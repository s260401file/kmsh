using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Staff;

public class TmsItem
{
    [JsonPropertyName("PE_NO")]
    public string? PeNo { get; set; }

    [JsonPropertyName("PE_NAME")]
    public string? PeName { get; set; }

    [JsonPropertyName("EMAIL")]
    public string? Email { get; set; }

    [JsonPropertyName("UNAME")]
    public string? Uname { get; set; }

    [JsonPropertyName("UNITCODE")]
    public string? Unitcode { get; set; }

    [JsonPropertyName("HR_TYPE")]
    public string? HrType { get; set; }

    [JsonPropertyName("DNAME")]
    public string? Dname { get; set; }

    [JsonPropertyName("TNAME")]
    public string? Tname { get; set; }

    [JsonPropertyName("LICENCE")]
    public string? Licence { get; set; }

    [JsonPropertyName("MVPN")]
    public string? Mvpn { get; set; }

    [JsonPropertyName("ARRIVE_DATE")]
    public string? ArriveDate { get; set; }

    [JsonPropertyName("LEAVE_DATE")]
    public string? LeaveDate { get; set; }

    [JsonPropertyName("ID_NO")]
    public string? IdNo { get; set; }

    [JsonPropertyName("SEX")]
    public string? Sex { get; set; }

    [JsonPropertyName("ATYPE")]
    public string? Atype { get; set; }

    [JsonPropertyName("BIRTH_DATE")]
    public string? BirthDate { get; set; }
}
