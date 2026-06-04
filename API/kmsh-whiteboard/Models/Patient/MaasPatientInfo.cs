namespace kmsh_whiteboard.Models.Patient;

/// <summary>病患基本資訊 (#8-2 MAASService/getPatientInfo)</summary>
public class MaasPatientInfo
{
    public string? Hhisnum { get; set; }
    public string? Hnamec { get; set; }
    public string? Hidno { get; set; }
    public MaasDts? Hbirthdt { get; set; }
    public string? Hsex { get; set; }
    public string? Hsexc { get; set; }
    public string? Hnursta { get; set; }
    public string? Hbedno { get; set; }
}

public class MaasDts
{
    public string? Dts { get; set; }
}

/// <summary>MAASService 回應包裝 (success/msg + 主體欄位)</summary>
public class MaasPatientResponse
{
    public string? Success { get; set; }
    public string? Msg { get; set; }
    public string? Hhisnum { get; set; }
    public string? Hnamec { get; set; }
    public string? Hidno { get; set; }
    public MaasDts? Hbirthdt { get; set; }
    public string? Hsex { get; set; }
    public string? Hsexc { get; set; }
    public string? Hnursta { get; set; }
    public string? Hbedno { get; set; }
}
