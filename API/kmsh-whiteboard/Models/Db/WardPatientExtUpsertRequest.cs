using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>病室動態臨床補充層 新增/修改請求（後台 CRUD 用）。以 UnitCode＋Hhisnum 識別病人。</summary>
public class WardPatientExtUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "";
    [Required] public string Hhisnum { get; set; } = "";
    public string? Department { get; set; }
    public string? AttendingDoctor { get; set; }
    public string? PrimaryNurse { get; set; }
    public string? Diagnosis { get; set; }
    public string? Condition { get; set; }
    public string? BedStatus { get; set; }
    public string? AdmissionDate { get; set; }
    public bool Dnr { get; set; }
    public string? Isolation { get; set; }
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
    public bool Renal { get; set; }
    public bool PortCath { get; set; }
    public bool DLVC { get; set; }
    public bool Foley { get; set; }
    public bool CVC { get; set; }
    public bool CardiacCath { get; set; }
    public bool Ventilator { get; set; }
    public bool Crrt { get; set; }
    public bool Ng { get; set; }
    public bool Surgery { get; set; }
    public bool Exam { get; set; }
    public bool Consult { get; set; }
    public string? Notes { get; set; }
    // ── ER 專屬狀態 ──
    public bool Observation { get; set; }
    public bool Awaiting { get; set; }
    public string? AwaitingType { get; set; }
    public bool TransferIn { get; set; }
    public bool TransferOut { get; set; }
    public string? TransferHospital { get; set; }
    public bool Admitted { get; set; }
    public string? AdmBedNo { get; set; }
    public bool Aad { get; set; }
    public bool Mbd { get; set; }
    public bool Deceased { get; set; }
    public string? ArrivalDate { get; set; }
    public string? ArrivalTime { get; set; }
    // ── OR 專屬 ──
    public string? ScrubNurse { get; set; }
    public string? CircNurse { get; set; }
    public string? SurgeryStatus { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public bool IsActive { get; set; } = true;
}
