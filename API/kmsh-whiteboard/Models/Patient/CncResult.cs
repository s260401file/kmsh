namespace kmsh_whiteboard.Models.Patient;

/// <summary>KMUH CNC 查床號結果 (#8-1 api/CNC，XML 回應)</summary>
public class CncResult
{
    public string? BedNo { get; set; }                // 床號
    public string? BirthDate { get; set; }            // 出生日期
    public string? ChartNo { get; set; }              // 病歷號
    public string? Idno { get; set; }                 // 身分證字號
    public string? PatientName { get; set; }          // 病人姓名
    public string? SexId { get; set; }                // 性別
}
