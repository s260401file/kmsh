namespace kmsh_whiteboard.Models.Lab;

/// <summary>依標籤檢核急作回應 (#9 LABService/islaburgent)</summary>
public class LabUrgentResponse
{
    public string? Success { get; set; }
    public string? Msg { get; set; }
    public string? Urgent { get; set; }
}
