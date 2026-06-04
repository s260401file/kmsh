namespace kmsh_whiteboard.Models.Patient;

/// <summary>KMUH CNC 查床號結果 (#8-1 api/CNC，XML 回應)</summary>
public class CncResult
{
    public string? BedNo { get; set; }
    public string? BirthDate { get; set; }
    public string? ChartNo { get; set; }
    public string? Idno { get; set; }
    public string? PatientName { get; set; }
    public string? SexId { get; set; }
}
