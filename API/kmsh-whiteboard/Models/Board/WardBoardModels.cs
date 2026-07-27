using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Board;

/// <summary>
/// 病室動態看板輸出 DTO。**刻意以 PascalCase 命名並用 JsonPropertyName 固定**，
/// 以直接相容前端 WardTab（bed.BedId / p.PatientName…），不受全域 camelCase 序列化影響。
/// </summary>
public class WardBoardResponse
{
    [JsonPropertyName("HospitalInfo")] public WardHospitalInfo HospitalInfo { get; set; } = new();
    [JsonPropertyName("Version")]      public long Version { get; set; }
    [JsonPropertyName("Beds")]         public List<WardBedDto> Beds { get; set; } = new();
}

public class WardHospitalInfo
{
    [JsonPropertyName("HospitalName")] public string HospitalName { get; set; } = "";
    [JsonPropertyName("WardName")]     public string WardName { get; set; } = "";
    [JsonPropertyName("WardCode")]     public string WardCode { get; set; } = "";
    [JsonPropertyName("WardDirector")] public string? WardDirector { get; set; }
    [JsonPropertyName("HeadNurse")]    public string? HeadNurse { get; set; }
}

public class WardBedDto
{
    [JsonPropertyName("BedId")]   public string BedId { get; set; } = "";
    [JsonPropertyName("Status")]  public string Status { get; set; } = "empty";
    [JsonPropertyName("Patient")] public WardPatientDto? Patient { get; set; }
}

/// <summary>病人卡/彈窗欄位（基本來自 Board_bed；臨床來自自建補充層）。</summary>
public class WardPatientDto
{
    [JsonPropertyName("PatientName")]     public string? PatientName { get; set; }
    [JsonPropertyName("Gender")]          public string? Gender { get; set; }
    [JsonPropertyName("Age")]             public int? Age { get; set; }
    [JsonPropertyName("BirthDate")]       public string? BirthDate { get; set; }
    [JsonPropertyName("MedicalRecordNo")] public string? MedicalRecordNo { get; set; }
    [JsonPropertyName("IdNo")]            public string? IdNo { get; set; }   // 身分證（白板需顯示）
    [JsonPropertyName("Department")]      public string? Department { get; set; }
    [JsonPropertyName("AdmissionDate")]   public string? AdmissionDate { get; set; }
    [JsonPropertyName("Diagnosis")]       public string? Diagnosis { get; set; }
    [JsonPropertyName("AttendingDoctor")] public string? AttendingDoctor { get; set; }
    [JsonPropertyName("PrimaryNurse")]    public string? PrimaryNurse { get; set; }
    [JsonPropertyName("Condition")]       public string? Condition { get; set; }
    [JsonPropertyName("Movement")]        public string? Movement { get; set; }   // 院方動態：A住院中/D已出院/E病故/I通知出院/M允許出院/T轉院
    [JsonPropertyName("Isolation")]       public string? Isolation { get; set; }
    [JsonPropertyName("Dnr")]             public bool Dnr { get; set; }
    [JsonPropertyName("FallRisk")]        public bool FallRisk { get; set; }
    [JsonPropertyName("Dependency")]      public string? Dependency { get; set; }
    [JsonPropertyName("Confidential")]    public bool Confidential { get; set; }
    [JsonPropertyName("NoTreatment")]     public bool NoTreatment { get; set; }
    [JsonPropertyName("Npo")]             public bool Npo { get; set; }
    [JsonPropertyName("Allergy")]         public bool Allergy { get; set; }
    [JsonPropertyName("Rrt")]             public bool Rrt { get; set; }
    [JsonPropertyName("Chemo")]           public bool Chemo { get; set; }
    [JsonPropertyName("Transport")]       public string? Transport { get; set; }
    [JsonPropertyName("Oxygen")]          public bool Oxygen { get; set; }
    [JsonPropertyName("Renal")]           public bool Renal { get; set; }
    [JsonPropertyName("PortCath")]        public bool PortCath { get; set; }
    [JsonPropertyName("DLVC")]            public bool DLVC { get; set; }
    [JsonPropertyName("Foley")]           public bool Foley { get; set; }
    [JsonPropertyName("CVC")]             public bool CVC { get; set; }
    [JsonPropertyName("CardiacCath")]     public bool CardiacCath { get; set; }
    [JsonPropertyName("Surgery")]         public bool Surgery { get; set; }
    [JsonPropertyName("Exam")]            public bool Exam { get; set; }
    [JsonPropertyName("Consult")]         public bool Consult { get; set; }
    [JsonPropertyName("Notes")]           public string? Notes { get; set; }
}
