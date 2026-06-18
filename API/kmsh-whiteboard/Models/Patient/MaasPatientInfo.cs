namespace kmsh_whiteboard.Models.Patient;

/// <summary>病患基本資訊 (#8-2 MAASService/getPatientInfo)</summary>
public class MaasPatientInfo
{
    public string? Hhisnum { get; set; }              // 病歷號 hhisnum
    public string? Hnamec { get; set; }               // 病人中文姓名 hnamec
    public string? Hidno { get; set; }                // 身分證字號 hidno
    public MaasDts? Hbirthdt { get; set; }            // 出生日期 hbirthdt（dts 包裝）
    public string? Hsex { get; set; }                 // 性別代碼 hsex
    public string? Hsexc { get; set; }                // 性別中文 hsexc
    public string? Hnursta { get; set; }              // 病房代碼 hnursta
    public string? Hbedno { get; set; }               // 床號 hbedno
}

/// <summary>MAASService 日期欄位通用包裝（值放在 dts 屬性內）。</summary>
public class MaasDts
{
    public string? Dts { get; set; }                  // 日期字串值
}

/// <summary>MAASService 回應包裝 (success/msg + 主體欄位)</summary>
public class MaasPatientResponse
{
    public string? Success { get; set; }              // 是否成功："Y"/"N"
    public string? Msg { get; set; }                  // 回應訊息（失敗原因）
    public string? Hhisnum { get; set; }              // 病歷號 hhisnum
    public string? Hnamec { get; set; }               // 病人中文姓名 hnamec
    public string? Hidno { get; set; }                // 身分證字號 hidno
    public MaasDts? Hbirthdt { get; set; }            // 出生日期 hbirthdt（dts 包裝）
    public string? Hsex { get; set; }                 // 性別代碼 hsex
    public string? Hsexc { get; set; }                // 性別中文 hsexc
    public string? Hnursta { get; set; }              // 病房代碼 hnursta
    public string? Hbedno { get; set; }               // 床號 hbedno
}
