using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Board;

/// <summary>
/// 院方 Board_bed API（住院在床清單）回應的單一在床病人。
/// 院方欄位為中文鍵、字串多補空白（含全形），取用前需 trim；身分證屬個資，不可輸出白板。
/// </summary>
public class BoardBedItem
{
    [JsonPropertyName("病歷號")]   public string? Hhisnum { get; set; }
    [JsonPropertyName("姓名")]     public string? Hnamec { get; set; }
    [JsonPropertyName("身分證")]   public string? Hidno { get; set; }   // 個資，僅後端比對用
    [JsonPropertyName("出生年月日")] public string? Hbirthdt { get; set; } // 如 1970/11/20
    [JsonPropertyName("性別")]     public string? Hsex { get; set; }
    [JsonPropertyName("負責醫師")] public string? Doctor { get; set; }   // 院方已回傳（可帶入，免後台自建）
    [JsonPropertyName("轉入日期")] public string? AdmitDate { get; set; }// ISO；院方已回傳（入院/轉入日）
    [JsonPropertyName("診斷")]     public string? Diagnosis { get; set; }// 院方已回傳（可帶入，免後台自建）
    [JsonPropertyName("科別")]     public string? Department { get; set; }// 院方已回傳（可帶入，免後台自建）
    [JsonPropertyName("病房")]     public string? Hnursta { get; set; }
    [JsonPropertyName("床位")]     public string? Hbed { get; set; }    // 如 006
    [JsonPropertyName("動態")]     public string? Movement { get; set; }// A住院中/D已出院/E病故/I通知出院/M允許出院/T轉院
    // 院方 2026-07 起把用藥 join 進來 → 同病人每筆用藥一列（欄名「抗生素」，實為全部用藥）。
    [JsonPropertyName("抗生素")]     public string? Med { get; set; }          // 藥品名稱（實為全用藥，非僅抗生素）
    [JsonPropertyName("開始使用日期")] public string? MedStartDate { get; set; }  // ISO
    [JsonPropertyName("開始使用時間")] public string? MedStartTime { get; set; }  // HH:mm:ss
    [JsonPropertyName("結束使用日期")] public string? MedEndDate { get; set; }    // ISO
    [JsonPropertyName("結束使用時間")] public string? MedEndTime { get; set; }    // HH:mm:ss
    // 去重時把同病人各列的用藥彙整於此（不參與序列化，供 antibiotic/live 使用）。
    [JsonIgnore] public List<BoardBedMed> Meds { get; set; } = new();
}

/// <summary>Board_bed 附帶的一筆用藥（院方欄名「抗生素」，實為全部用藥）。</summary>
public class BoardBedMed
{
    public string? Name { get; set; }
    public string? StartDate { get; set; }
    public string? StartTime { get; set; }
    public string? EndDate { get; set; }
    public string? EndTime { get; set; }
}

/// <summary>Board_bed 回應外殼：{ success, data[] }。</summary>
public class BoardBedResponse
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("data")]    public List<BoardBedItem> Data { get; set; } = new();
}
