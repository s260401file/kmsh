using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Board;

/// <summary>
/// OR 手術派班輸出（自建 OrShiftStaff＋OrShiftRoom 組裝）。PascalCase（JsonPropertyName 固定），
/// 相容前端 ScheduleTab（shift.ShiftType / Charge.Name / Rooms[].ScrubNurse…）。
/// </summary>
public class OrScheduleResponse
{
    [JsonPropertyName("Success")] public bool Success { get; set; } = true;
    [JsonPropertyName("Message")] public string Message { get; set; } = "";
    [JsonPropertyName("Data")]    public OrScheduleData Data { get; set; } = new();
}

public class OrScheduleData
{
    [JsonPropertyName("WardCode")]  public string WardCode { get; set; } = "OR";
    [JsonPropertyName("QueryDate")] public string? QueryDate { get; set; }
    [JsonPropertyName("Shifts")]    public List<OrShiftDto> Shifts { get; set; } = new();
}

public class OrShiftDto
{
    [JsonPropertyName("ShiftType")]  public string ShiftType { get; set; } = "";
    [JsonPropertyName("ShiftTime")]  public string? ShiftTime { get; set; }
    [JsonPropertyName("Charge")]     public OrPersonDto Charge { get; set; } = new();
    [JsonPropertyName("Anesthesia")] public List<OrAnesDto> Anesthesia { get; set; } = new();
    [JsonPropertyName("CircTech")]   public OrPersonDto? CircTech { get; set; }
    [JsonPropertyName("Rooms")]      public List<OrSchedRoomDto> Rooms { get; set; } = new();
}

/// <summary>值班護理長 / 體外循環技師（含職稱）。</summary>
public class OrPersonDto
{
    [JsonPropertyName("Name")]      public string? Name { get; set; }
    [JsonPropertyName("Role")]      public string? Role { get; set; }      // 職稱（CircTech 用）
    [JsonPropertyName("Extension")] public string? Extension { get; set; }
}

public class OrAnesDto
{
    [JsonPropertyName("StaffId")]   public int StaffId { get; set; }
    [JsonPropertyName("Name")]      public string? Name { get; set; }
    [JsonPropertyName("Role")]      public string? Role { get; set; }      // 職稱
    [JsonPropertyName("Extension")] public string? Extension { get; set; }
}

public class OrSchedRoomDto
{
    [JsonPropertyName("RoomId")]     public string RoomId { get; set; } = "";
    [JsonPropertyName("ScrubNurse")] public string? ScrubNurse { get; set; }
    [JsonPropertyName("CircNurse")]  public string? CircNurse { get; set; }
    [JsonPropertyName("Extension")]  public string? Extension { get; set; }
}

/// <summary>OR 特殊交班輸出（自建 OrHandover）。PascalCase 相容前端 HandoverTab。</summary>
public class OrHandoverResponse
{
    [JsonPropertyName("Success")] public bool Success { get; set; } = true;
    [JsonPropertyName("Message")] public string Message { get; set; } = "";
    [JsonPropertyName("Data")]    public OrHandoverData Data { get; set; } = new();
}

public class OrHandoverData
{
    [JsonPropertyName("WardCode")]  public string WardCode { get; set; } = "OR";
    [JsonPropertyName("QueryDate")] public string? QueryDate { get; set; }
    [JsonPropertyName("Items")]     public List<OrHandoverDto> Items { get; set; } = new();
}

/// <summary>OR 手術清單一筆（供 ICU/W52「手術資訊」分頁；camelCase 輸出，無 JsonPropertyName）。</summary>
public class OrSurgeryListItem
{
    public string? OrRoom { get; set; }            // OR-xx（R 經主檔對應）
    public int? SeqNo { get; set; }                // 刀次：該日該刀房依時間排序之序號（1-based）
    public string? Date { get; set; }              // yyyy-MM-dd（手術日期）
    public string? ScheduledTime { get; set; }     // HH:mm
    public string? BedId { get; set; }             // 病人目前病床號（Board_bed；供 {unit}/surgeries）
    public string? PatientName { get; set; }
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? Procedure { get; set; }         // 術式
    public string? Diagnosis { get; set; }
    public string? AnesthesiaMethod { get; set; }  // 麻醉
    public string? AttendingSurgeon { get; set; }  // 主刀
    public string? Status { get; set; }            // 手術中/待手術/已完成（依時間推導）
}

public class OrHandoverDto
{
    [JsonPropertyName("HandoverId")]       public int HandoverId { get; set; }
    [JsonPropertyName("RoomId")]           public string? RoomId { get; set; }
    [JsonPropertyName("SurgerySource")]    public string? SurgerySource { get; set; }
    [JsonPropertyName("PatientName")]      public string? PatientName { get; set; }
    [JsonPropertyName("Gender")]           public string? Gender { get; set; }
    [JsonPropertyName("Age")]              public int? Age { get; set; }
    [JsonPropertyName("MedRecord")]        public string? MedRecord { get; set; }
    [JsonPropertyName("SurgeryName")]      public string? SurgeryName { get; set; }
    [JsonPropertyName("SurgeonName")]      public string? SurgeonName { get; set; }
    [JsonPropertyName("DestWard")]         public string? DestWard { get; set; }
    [JsonPropertyName("DestBed")]          public string? DestBed { get; set; }
    [JsonPropertyName("EndTime")]          public string? EndTime { get; set; }
    [JsonPropertyName("BloodLoss")]        public int? BloodLoss { get; set; }
    [JsonPropertyName("BloodTransfusion")] public int? BloodTransfusion { get; set; }
    [JsonPropertyName("DrainDetails")]     public string? DrainDetails { get; set; }
    [JsonPropertyName("SpecialNotes")]     public string? SpecialNotes { get; set; }
}
