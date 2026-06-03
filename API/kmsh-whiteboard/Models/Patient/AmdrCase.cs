using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Patient;

public class AmdrCase
{
    [JsonPropertyName("hhisnum")]
    public string? Hhisnum { get; set; }

    [JsonPropertyName("hnursta")]
    public string? Hnursta { get; set; }

    [JsonPropertyName("hbed")]
    public string? Hbed { get; set; }

    [JsonPropertyName("hpbasic")]
    public AmdrHpbasic? Hpbasic { get; set; }

    [JsonPropertyName("hadmdt")]
    public AmdrDts? Hadmdt { get; set; }

    [JsonPropertyName("hadmtm")]
    public AmdrDts? Hadmtm { get; set; }

    [JsonPropertyName("hcaseno")]
    public string? Hcaseno { get; set; }

    [JsonPropertyName("vsName")]
    public string? VsName { get; set; }

    [JsonPropertyName("vsNo")]
    public string? VsNo { get; set; }

    [JsonPropertyName("drName")]
    public string? DrName { get; set; }

    [JsonPropertyName("drNo")]
    public string? DrNo { get; set; }

    [JsonPropertyName("hcursvcl")]
    public string? Hcursvcl { get; set; }

    [JsonPropertyName("hcurdesc")]
    public string? Hcurdesc { get; set; }

    [JsonPropertyName("hosptrou")]
    public string? Hosptrou { get; set; }

    [JsonPropertyName("hbedstat")]
    public string? Hbedstat { get; set; }

    [JsonPropertyName("nurseNo")]
    public string? NurseNo { get; set; }

    [JsonPropertyName("nurseName")]
    public string? NurseName { get; set; }

    [JsonPropertyName("hpatstatc")]
    public string? Hpatstatc { get; set; }

    [JsonPropertyName("hpatstat")]
    public string? Hpatstat { get; set; }

    [JsonPropertyName("diagnos")]
    public AmdrDiagnos? Diagnos { get; set; }

    [JsonPropertyName("hemgtype")]
    public string? Hemgtype { get; set; }

    [JsonPropertyName("patflag")]
    public AmdrPatFlag? Patflag { get; set; }

    [JsonPropertyName("amdays")]
    public int? Amdays { get; set; }

    [JsonPropertyName("hinptype")]
    public string? Hinptype { get; set; }  // O=門診 E=急診，AMPat 專用
}

public class AmdrHpbasic
{
    [JsonPropertyName("hnamec")]
    public string? Hnamec { get; set; }

    [JsonPropertyName("hidno")]
    public string? Hidno { get; set; }

    [JsonPropertyName("hsex")]
    public string? Hsex { get; set; }

    [JsonPropertyName("hbirthdt")]
    public AmdrDts? Hbirthdt { get; set; }
}

public class AmdrDts
{
    [JsonPropertyName("dts")]
    public string? Dts { get; set; }
}

public class AmdrDiagnos
{
    [JsonPropertyName("icd10lst")]
    public List<AmdrIcd10>? Icd10lst { get; set; }
}

public class AmdrIcd10
{
    [JsonPropertyName("icdkey")]
    public string? Icdkey { get; set; }
}

public class AmdrPatFlag
{
    [JsonPropertyName("hicmap")]
    public AmdrHicmap? Hicmap { get; set; }

    [JsonPropertyName("critical")]
    public string? Critical { get; set; }
}

public class AmdrHicmap
{
    [JsonPropertyName("activityMode")]
    public string? ActivityMode { get; set; }  // G=綠 Y=黃 R=紅

    [JsonPropertyName("fall")]
    public string? Fall { get; set; }

    [JsonPropertyName("dnr")]
    public string? Dnr { get; set; }

    [JsonPropertyName("iso")]
    public string? Iso { get; set; }

    [JsonPropertyName("npo")]
    public string? Npo { get; set; }
}
