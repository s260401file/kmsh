using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Patient;

/// <summary>
/// 高榮(VGHKS) HIS「住院病人病況(AMDR/AMPat)」介面回應的單一病人案件主體。
/// 用於白板病室動態，呈現床位、主治/住院醫師、診斷、病況旗標等。
/// </summary>
public class AmdrCase
{
    [JsonPropertyName("hhisnum")]
    public string? Hhisnum { get; set; }              // 病歷號 hhisnum

    [JsonPropertyName("hnursta")]
    public string? Hnursta { get; set; }              // 病房代碼 hnursta

    [JsonPropertyName("hbed")]
    public string? Hbed { get; set; }                 // 床號 hbed

    [JsonPropertyName("hpbasic")]
    public AmdrHpbasic? Hpbasic { get; set; }         // 病人基本資料（姓名/身分證/性別/生日）

    [JsonPropertyName("hadmdt")]
    public AmdrDts? Hadmdt { get; set; }              // 入院日期 hadmdt

    [JsonPropertyName("hadmtm")]
    public AmdrDts? Hadmtm { get; set; }              // 入院時間 hadmtm

    [JsonPropertyName("hcaseno")]
    public string? Hcaseno { get; set; }              // 住院案號 hcaseno

    [JsonPropertyName("vsName")]
    public string? VsName { get; set; }               // 主治醫師姓名 vsName

    [JsonPropertyName("vsNo")]
    public string? VsNo { get; set; }                 // 主治醫師代號 vsNo

    [JsonPropertyName("drName")]
    public string? DrName { get; set; }               // 住院醫師姓名 drName

    [JsonPropertyName("drNo")]
    public string? DrNo { get; set; }                 // 住院醫師代號 drNo

    [JsonPropertyName("hcursvcl")]
    public string? Hcursvcl { get; set; }             // 目前科別代碼 hcursvcl

    [JsonPropertyName("hcurdesc")]
    public string? Hcurdesc { get; set; }             // 目前科別名稱 hcurdesc

    [JsonPropertyName("hosptrou")]
    public string? Hosptrou { get; set; }             // 住院病況/主訴 hosptrou

    [JsonPropertyName("hbedstat")]
    public string? Hbedstat { get; set; }             // 床位狀態 hbedstat

    [JsonPropertyName("nurseNo")]
    public string? NurseNo { get; set; }              // 主護理師代號 nurseNo

    [JsonPropertyName("nurseName")]
    public string? NurseName { get; set; }            // 主護理師姓名 nurseName

    [JsonPropertyName("hpatstatc")]
    public string? Hpatstatc { get; set; }            // 病人狀態代碼 hpatstatc

    [JsonPropertyName("hpatstat")]
    public string? Hpatstat { get; set; }             // 病人狀態名稱 hpatstat

    [JsonPropertyName("diagnos")]
    public AmdrDiagnos? Diagnos { get; set; }         // 診斷（ICD-10 清單）

    [JsonPropertyName("hemgtype")]
    public string? Hemgtype { get; set; }             // 急診類別 hemgtype

    [JsonPropertyName("patflag")]
    public AmdrPatFlag? Patflag { get; set; }         // 病況旗標（活動度/危急/跌倒/DNR 等）

    [JsonPropertyName("amdays")]
    public int? Amdays { get; set; }                  // 住院天數 amdays

    [JsonPropertyName("hinptype")]
    public string? Hinptype { get; set; }  // O=門診 E=急診，AMPat 專用
}

/// <summary>AmdrCase 的病人基本資料子物件。</summary>
public class AmdrHpbasic
{
    [JsonPropertyName("hnamec")]
    public string? Hnamec { get; set; }               // 病人中文姓名 hnamec

    [JsonPropertyName("hidno")]
    public string? Hidno { get; set; }                // 身分證字號 hidno

    [JsonPropertyName("hsex")]
    public string? Hsex { get; set; }                 // 性別 hsex

    [JsonPropertyName("hbirthdt")]
    public AmdrDts? Hbirthdt { get; set; }            // 出生日期 hbirthdt
}

/// <summary>AMDR 日期/時間欄位通用包裝（值放在 dts 屬性內）。</summary>
public class AmdrDts
{
    [JsonPropertyName("dts")]
    public string? Dts { get; set; }                  // 日期/時間字串值
}

/// <summary>AmdrCase 診斷子物件（內含 ICD-10 清單）。</summary>
public class AmdrDiagnos
{
    [JsonPropertyName("icd10lst")]
    public List<AmdrIcd10>? Icd10lst { get; set; }    // ICD-10 診斷碼清單
}

/// <summary>單一 ICD-10 診斷碼項目。</summary>
public class AmdrIcd10
{
    [JsonPropertyName("icdkey")]
    public string? Icdkey { get; set; }               // ICD-10 診斷碼 icdkey
}

/// <summary>AmdrCase 病況旗標子物件。</summary>
public class AmdrPatFlag
{
    [JsonPropertyName("hicmap")]
    public AmdrHicmap? Hicmap { get; set; }           // 護理照護圖示旗標群組

    [JsonPropertyName("critical")]
    public string? Critical { get; set; }             // 是否危急/病危註記
}

/// <summary>護理照護圖示旗標（白板上以圖示呈現各項照護注意事項）。</summary>
public class AmdrHicmap
{
    [JsonPropertyName("activityMode")]
    public string? ActivityMode { get; set; }  // G=綠 Y=黃 R=紅

    [JsonPropertyName("fall")]
    public string? Fall { get; set; }                 // 跌倒風險旗標 fall

    [JsonPropertyName("dnr")]
    public string? Dnr { get; set; }                  // 不施行心肺復甦(DNR)旗標 dnr

    [JsonPropertyName("iso")]
    public string? Iso { get; set; }                  // 隔離(Isolation)旗標 iso

    [JsonPropertyName("npo")]
    public string? Npo { get; set; }                  // 禁食(NPO)旗標 npo
}
