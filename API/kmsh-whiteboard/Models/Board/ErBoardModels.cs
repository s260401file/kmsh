using System.Text.Json.Serialization;

namespace kmsh_whiteboard.Models.Board;

/// <summary>
/// ER 病室動態看板輸出。**床位導向**：以自建床位主檔(ErBed)鋪平面圖，Board_ER 在室病人
/// 以 bedId merge 上去、缺的臨床/狀態由 WardPatientExt(ER) overlay 補。
/// 刻意 PascalCase（JsonPropertyName 固定），直接相容前端 ER WardTab（bed.BedId / p.PatientName…）。
/// </summary>
public class ErBoardResponse
{
    [JsonPropertyName("Count")]   public int Count { get; set; }    // 在室佔床數
    [JsonPropertyName("DeceasedCount")] public int DeceasedCount { get; set; }  // 死亡類別(Board_ER_TypeE，不佔床)筆數
    [JsonPropertyName("Version")] public long Version { get; set; }
    [JsonPropertyName("Beds")]    public List<ErBedDto> Beds { get; set; } = new();
}

/// <summary>一張床（含平面圖座標）；空床 Patient=null；床碼不在主檔的在室病人 Unplaced=true。</summary>
public class ErBedDto
{
    [JsonPropertyName("BedId")]     public string BedId { get; set; } = "";
    [JsonPropertyName("Ward")]      public string? Ward { get; set; }
    [JsonPropertyName("Zone")]      public string? Zone { get; set; }
    [JsonPropertyName("GridCol")]   public int? GridCol { get; set; }
    [JsonPropertyName("GridRow")]   public int? GridRow { get; set; }
    [JsonPropertyName("SortOrder")] public int SortOrder { get; set; }
    [JsonPropertyName("Status")]    public string Status { get; set; } = "empty";
    [JsonPropertyName("Unplaced")]  public bool Unplaced { get; set; }   // 床碼未建主檔（落溢位區，提示後台補建）
    [JsonPropertyName("Patient")]   public ErBedPatientDto? Patient { get; set; }
}

/// <summary>ER 病人卡/彈窗欄位（基本＋負責醫師＋檢傷來自 Board_ER；臨床/狀態來自 overlay）。</summary>
public class ErBedPatientDto
{
    // ── Board_ER 真實 ──
    [JsonPropertyName("PatientName")] public string? PatientName { get; set; }
    [JsonPropertyName("Gender")]      public string? Gender { get; set; }
    [JsonPropertyName("Age")]         public int? Age { get; set; }
    [JsonPropertyName("BirthDate")]   public string? BirthDate { get; set; }
    [JsonPropertyName("MedRecord")]   public string? MedRecord { get; set; }
    [JsonPropertyName("IdNo")]        public string? IdNo { get; set; }       // 身分證（白板需顯示）
    [JsonPropertyName("Doctor")]      public string? Doctor { get; set; }     // 負責醫師
    [JsonPropertyName("DoctorCard")]  public string? DoctorCard { get; set; }
    [JsonPropertyName("Flow")]        public string? Flow { get; set; }       // 病患動向（原碼，待判讀）
    [JsonPropertyName("Category")]    public string? Category { get; set; }   // 類別（原碼）
    [JsonPropertyName("Triage")]      public int? Triage { get; set; }        // 檢傷 1/2/3
    [JsonPropertyName("TriageGrade")] public string? TriageGrade { get; set; }// A/B/C
    [JsonPropertyName("TriageRaw")]   public string? TriageRaw { get; set; }  // 院方原始檢傷分類（E/2/3/4/5/9）
    // ── 自建 overlay（WardPatientExt, UnitCode='ER'）──
    [JsonPropertyName("Department")]       public string? Department { get; set; }
    [JsonPropertyName("Nurse")]            public string? Nurse { get; set; }
    [JsonPropertyName("Diagnosis")]        public string? Diagnosis { get; set; }
    [JsonPropertyName("Isolation")]        public string? Isolation { get; set; }
    [JsonPropertyName("Notes")]            public string? Notes { get; set; }
    [JsonPropertyName("ArrivalDate")]      public string? ArrivalDate { get; set; }
    [JsonPropertyName("ArrivalTime")]      public string? ArrivalTime { get; set; }
    [JsonPropertyName("Observation")]      public bool Observation { get; set; }
    [JsonPropertyName("Awaiting")]         public bool Awaiting { get; set; }
    [JsonPropertyName("AwaitingType")]     public string? AwaitingType { get; set; }
    [JsonPropertyName("TransferIn")]       public bool TransferIn { get; set; }
    [JsonPropertyName("TransferOut")]      public bool TransferOut { get; set; }
    [JsonPropertyName("TransferHospital")] public string? TransferHospital { get; set; }     // 轉出醫院
    [JsonPropertyName("TransferInHospital")] public string? TransferInHospital { get; set; } // 轉入醫院
    [JsonPropertyName("Admitted")]         public bool Admitted { get; set; }
    [JsonPropertyName("AdmBedNo")]         public string? AdmBedNo { get; set; }
    [JsonPropertyName("Dnr")]              public bool Dnr { get; set; }
    [JsonPropertyName("Aad")]              public bool Aad { get; set; }
    [JsonPropertyName("Mbd")]              public bool Mbd { get; set; }
    [JsonPropertyName("Deceased")]         public bool Deceased { get; set; }
    [JsonPropertyName("FallRisk")]         public bool FallRisk { get; set; }
    [JsonPropertyName("Allergy")]          public bool Allergy { get; set; }
    [JsonPropertyName("Exam")]             public bool Exam { get; set; }
    [JsonPropertyName("Consult")]          public bool Consult { get; set; }
}
