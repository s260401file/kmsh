using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Board;

/// <summary>
/// OR 手術動態看板輸出。**刀房導向**：以自建刀房主檔(OrRoom)鋪 4×2 房卡，Board_OR 今日手術
/// 以 ApiRoom merge、缺的狀態/起訖/刷手流動由 WardPatientExt(OR) overlay 補。
/// PascalCase（JsonPropertyName 固定），相容前端 OR WardTab（room.RoomId / p.PatientName…）。
/// </summary>
public class OrBoardResponse
{
    [JsonPropertyName("Count")]   public int Count { get; set; }    // 今日總台數
    [JsonPropertyName("Version")] public long Version { get; set; }
    [JsonPropertyName("Rooms")]   public List<OrRoomDto> Rooms { get; set; } = new();
}

/// <summary>一間刀房；空房 Patient=null。Patient＝今日進行中/首台，Surgeries＝今日全部（供 Modal）。</summary>
public class OrRoomDto
{
    [JsonPropertyName("RoomId")]     public string RoomId { get; set; } = "";
    [JsonPropertyName("ApiRoom")]    public string? ApiRoom { get; set; }
    [JsonPropertyName("SortOrder")]  public int SortOrder { get; set; }
    [JsonPropertyName("Status")]     public string Status { get; set; } = "empty";  // in-surgery/prep/completed/scheduled/empty
    [JsonPropertyName("TodayCount")] public int TodayCount { get; set; }
    [JsonPropertyName("Patient")]    public OrSurgeryDto? Patient { get; set; }
    [JsonPropertyName("Surgeries")]  public List<OrSurgeryDto> Surgeries { get; set; } = new();
}

/// <summary>一台手術（基本/術式/主刀/麻醉/時間來自 Board_OR；狀態/起訖/刷手流動/科別來自 overlay）。</summary>
public class OrSurgeryDto
{
    [JsonPropertyName("PatientName")]   public string? PatientName { get; set; }
    [JsonPropertyName("Gender")]        public string? Gender { get; set; }
    [JsonPropertyName("Age")]           public int? Age { get; set; }
    [JsonPropertyName("BirthDate")]     public string? BirthDate { get; set; }
    [JsonPropertyName("MedRecord")]     public string? MedRecord { get; set; }
    [JsonPropertyName("Diagnosis")]     public string? Diagnosis { get; set; }
    [JsonPropertyName("SurgeryName")]   public string? SurgeryName { get; set; }
    [JsonPropertyName("Doctor")]        public string? Doctor { get; set; }       // 主刀
    [JsonPropertyName("AnesType")]      public string? AnesType { get; set; }     // 麻醉原碼
    [JsonPropertyName("SurgerySource")] public string? SurgerySource { get; set; }// 來源→急/門/住刀（暫定）
    [JsonPropertyName("ScheduledTime")] public string? ScheduledTime { get; set; }// 手術時間
    // ── overlay（狀態/起訖來自 OR_SYSTEM；無對應時退回 WardPatientExt 手動登記）──
    [JsonPropertyName("SurgeryStatus")] public string? SurgeryStatus { get; set; } // 待手術/等候中/手術中/手術結束/已離開
    [JsonPropertyName("StartTime")]     public string? StartTime { get; set; }     // 進手術室 ENT_TIME (HH:mm)
    [JsonPropertyName("EndTime")]       public string? EndTime { get; set; }       // 手術結束 CUT_TIME (HH:mm)
    [JsonPropertyName("ArriveTime")]    public string? ArriveTime { get; set; }    // 到達等候區 COM_TIME (HH:mm)
    [JsonPropertyName("LeaveTime")]     public string? LeaveTime { get; set; }     // 離開刀房 RES_TIME (HH:mm)
    [JsonPropertyName("Destination")]   public string? Destination { get; set; }   // 已離開去向：恢復室/等候區/加護病房
    [JsonPropertyName("Department")]    public string? Department { get; set; }
    [JsonPropertyName("ScrubNurse")]    public string? ScrubNurse { get; set; }
    [JsonPropertyName("CircNurse")]     public string? CircNurse { get; set; }
    [JsonPropertyName("Notes")]         public string? Notes { get; set; }
}
