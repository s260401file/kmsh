namespace kmsh_whiteboard.Models.Board;

/// <summary>
/// ICU 病室動態看板輸出 DTO。屬性為 PascalCase，靠全域 camelCase 序列化政策輸出 camelCase，
/// 直接相容 ICU WardTab（bed.id / bed.floor / bed.patient.name…）。避免全大寫屬性名（用 Cvc/Crrt）。
/// </summary>
public class IcuBoardResponse
{
    public IcuHospitalInfo HospitalInfo { get; set; } = new();
    public long Version { get; set; }
    public List<IcuBedDto> Beds { get; set; } = new();
}

public class IcuHospitalInfo
{
    public string Name { get; set; } = "";
    public string Ward { get; set; } = "";
    public string? WardDirector { get; set; }
    public string? HeadNurse { get; set; }
}

public class IcuBedDto
{
    public string Id { get; set; } = "";       // F4-12 / F3-01
    public int Floor { get; set; }              // 4 / 3
    public int Num { get; set; }                // 12
    public string Status { get; set; } = "empty";
    public IcuPatientDto? Patient { get; set; }
}

/// <summary>ICU 病人欄位（基本來自 Board_bed；臨床來自自建補充層）。</summary>
public class IcuPatientDto
{
    public string? Name { get; set; }
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? BirthDate { get; set; }
    public string? MedRecord { get; set; }
    public string? IdNo { get; set; }            // 身分證（需顯示）
    public string? Department { get; set; }
    public string? Admission { get; set; }       // MM/DD（住院天數用）
    public string? Diagnosis { get; set; }
    public string? Doctor { get; set; }          // 主治
    public string? Nurse { get; set; }           // 責護
    public string? Condition { get; set; }       // 穩定/重症/危急（畫面 C/B/A）
    public string? Isolation { get; set; }
    public bool Dnr { get; set; }
    public bool Ventilator { get; set; }         // 氣管內管(ETT)
    public bool Crrt { get; set; }
    public bool Ng { get; set; }
    public bool Restraint { get; set; }          // 身體約束（來源：院方 AICUPHY 即時 API，非自建 overlay）
    public bool Foley { get; set; }
    public bool Cvc { get; set; }
    public bool FallRisk { get; set; }
    public string? Dependency { get; set; }
    public bool Confidential { get; set; }
    public bool NoTreatment { get; set; }
    public bool Npo { get; set; }
    public bool Allergy { get; set; }
    public bool Rrt { get; set; }
    public bool Chemo { get; set; }
    public string? Transport { get; set; }
    public bool Oxygen { get; set; }
    public bool Surgery { get; set; }
    public bool Exam { get; set; }
    public bool Consult { get; set; }
    public string? Notes { get; set; }
}
