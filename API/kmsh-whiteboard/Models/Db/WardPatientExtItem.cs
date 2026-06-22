namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// 自建「病室動態臨床補充層」一筆（一病人一列，以病歷號 Hhisnum 為鍵）。
/// 用於補 Board_bed 不足的臨床欄位（科別/主治/責護/診斷/病況/狀態/各註記旗標/管路…）；
/// 後台可增刪改，待 HIS/DB2_DUMP 開放後逐欄改由院方來源。對應 WardTab 病人卡/彈窗欄位。
/// </summary>
public class WardPatientExtItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";       // 單位（W52/ICU…）
    public string Hhisnum { get; set; } = "";         // 病歷號（與 Board_bed 對應鍵）
    public string? Department { get; set; }           // 科別
    public string? AttendingDoctor { get; set; }      // 主治醫師
    public string? PrimaryNurse { get; set; }         // 責任護理師
    public string? Diagnosis { get; set; }            // 診斷
    public string? Condition { get; set; }            // 病況等級（穩定/重症/危急）
    public string? BedStatus { get; set; }            // 床位狀態（occupied/isolation/transfer/transfer-in/discharge）
    public string? AdmissionDate { get; set; }        // 入院日期（MM/DD，供住院天數）
    public bool Dnr { get; set; }
    public string? Isolation { get; set; }            // 隔離方式（無/接觸隔離/飛沫隔離/空氣隔離）
    public bool FallRisk { get; set; }
    public string? Dependency { get; set; }           // 依賴度 L1/L2/L3（民生不用，預留）
    public bool Confidential { get; set; }
    public bool NoTreatment { get; set; }
    public bool Npo { get; set; }
    public bool Allergy { get; set; }
    public bool Rrt { get; set; }
    public bool Chemo { get; set; }
    public string? Transport { get; set; }            // 運送方式（輪椅/推床）
    public bool Oxygen { get; set; }
    public bool Renal { get; set; }
    public bool PortCath { get; set; }                // 人工血管
    public bool DLVC { get; set; }                    // 雙腔靜脈導管
    public bool Foley { get; set; }                   // 導尿管
    public bool CVC { get; set; }                     // 中心靜脈導管
    public bool CardiacCath { get; set; }             // 心導管
    public bool Ventilator { get; set; }              // 呼吸器/氣管內管(ETT)（ICU）
    public bool Crrt { get; set; }                    // 連續性腎臟替代療法(ICU)
    public bool Ng { get; set; }                      // 鼻胃管（ICU）
    public bool Surgery { get; set; }
    public bool Exam { get; set; }
    public bool Consult { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
