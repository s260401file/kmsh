using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

// =============================================================================
// 人員管理（v14）：人員主檔＋多單位多角色＋排班＋床位指派＋查房＋結構化交班。
// 一人可跨多單位/多角色；權限＝IsAdmin（全站）/ StaffUnitRole.IsManager（該區管理者）。
// 純 C# DTO → 全域 camelCase 序列化（前端據此組裝）。
// =============================================================================

// ── 1. 人員主檔 ──────────────────────────────────────────────
public class StaffItem
{
    public int Id { get; set; }
    public string EmployeeNo { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Ext { get; set; }
    public string? Mobile { get; set; }
    public bool IsAdmin { get; set; }
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class StaffUpsertRequest
{
    [Required] public string EmployeeNo { get; set; } = "";
    [Required] public string Name { get; set; } = "";
    public string? Ext { get; set; }
    public string? Mobile { get; set; }
    public bool IsAdmin { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

// ── 2. 人員×單位×角色 ─────────────────────────────────────────
public class StaffUnitRoleItem
{
    public int Id { get; set; }
    public int StaffId { get; set; }
    public string UnitCode { get; set; } = "";
    public string Role { get; set; } = "";
    public string? Department { get; set; }
    public bool IsManager { get; set; }
    public string? GroupKey { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    // 連帶人員欄位（join 查詢時填入，後台/組裝用）
    public string? EmployeeNo { get; set; }
    public string? Name { get; set; }
    public string? Ext { get; set; }
    public string? Mobile { get; set; }
}

public class StaffUnitRoleUpsertRequest
{
    public int StaffId { get; set; }
    [Required] public string UnitCode { get; set; } = "";
    [Required] public string Role { get; set; } = "";
    public string? Department { get; set; }
    public bool IsManager { get; set; }
    public string? GroupKey { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

// ── 3. 排班 ─────────────────────────────────────────────────
public class StaffScheduleItem
{
    public int Id { get; set; }
    public int StaffId { get; set; }
    public string UnitCode { get; set; } = "";
    public DateTime WorkDate { get; set; }
    public string Shift { get; set; } = "";
    public string? EmergencyGroup { get; set; }
    public bool IsCharge { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    // 連帶人員/角色（組裝用）
    public string? EmployeeNo { get; set; }
    public string? Name { get; set; }
    public string? Ext { get; set; }
    public string? Role { get; set; }
    public string? Department { get; set; }
}

public class StaffScheduleUpsertRequest
{
    public int StaffId { get; set; }
    [Required] public string UnitCode { get; set; } = "";
    [Required] public string WorkDate { get; set; } = "";   // yyyy-MM-dd
    [Required] public string Shift { get; set; } = "";
    public string? EmergencyGroup { get; set; }
    public bool IsCharge { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

// ── 4. 床位指派（主護/主治/專師） ──────────────────────────────
public class BedStaffAssignmentItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";
    public string BedId { get; set; } = "";
    public DateTime WorkDate { get; set; }
    public string? Shift { get; set; }
    public int StaffId { get; set; }
    public string AssignType { get; set; } = "主護";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? EmployeeNo { get; set; }
    public string? Name { get; set; }
}

// 勾床配對請求：把某護理師在 unit/date 的主護床設為恰好 bedIds
public class BedNurseSetRequest
{
    public int StaffId { get; set; }
    public string WorkDate { get; set; } = "";
    public List<string> BedIds { get; set; } = new();
}

public class BedStaffAssignmentUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "";
    [Required] public string BedId { get; set; } = "";
    [Required] public string WorkDate { get; set; } = "";
    public string? Shift { get; set; }
    public int StaffId { get; set; }
    public string AssignType { get; set; } = "主護";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

// ── 5. 查房表 ───────────────────────────────────────────────
public class DoctorRoundItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";
    public DateTime RoundDate { get; set; }
    public int? StaffId { get; set; }
    public string? DoctorName { get; set; }
    public string? Specialty { get; set; }
    public string? EstimatedTime { get; set; }
    public string? ActualTime { get; set; }
    public bool IsCompleted { get; set; }
    public string? Remark { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DoctorRoundUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "";
    [Required] public string RoundDate { get; set; } = "";
    public int? StaffId { get; set; }
    public string? DoctorName { get; set; }
    public string? Specialty { get; set; }
    public string? EstimatedTime { get; set; }
    public string? ActualTime { get; set; }
    public bool IsCompleted { get; set; }
    public string? Remark { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

// ── 6. 護理交班 header ──────────────────────────────────────
public class HandoverShiftItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";
    public DateTime WorkDate { get; set; }
    public string? FromShift { get; set; }
    public string? FromShiftTime { get; set; }
    public string? ToShift { get; set; }
    public string? ToShiftTime { get; set; }
    public string? HandoverTime { get; set; }
    public string? FromStaffIds { get; set; }
    public string? ToStaffIds { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class HandoverShiftUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "";
    [Required] public string WorkDate { get; set; } = "";
    public string? FromShift { get; set; }
    public string? FromShiftTime { get; set; }
    public string? ToShift { get; set; }
    public string? ToShiftTime { get; set; }
    public string? HandoverTime { get; set; }
    public string? FromStaffIds { get; set; }
    public string? ToStaffIds { get; set; }
    public bool IsActive { get; set; } = true;
}

// ── 7. 護理交班-病人卡 ──────────────────────────────────────
public class HandoverPatientItem
{
    public int Id { get; set; }
    public int HandoverShiftId { get; set; }
    public string? BedNo { get; set; }
    public string? Hhisnum { get; set; }
    public string? PatientName { get; set; }
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? Diagnosis { get; set; }
    public string? Priority { get; set; }
    public int SortOrder { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class HandoverPatientUpsertRequest
{
    public int HandoverShiftId { get; set; }
    public string? BedNo { get; set; }
    public string? Hhisnum { get; set; }
    public string? PatientName { get; set; }
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? Diagnosis { get; set; }
    public string? Priority { get; set; }
    public int SortOrder { get; set; }
}

// ── 8. 護理交班-事項 ────────────────────────────────────────
public class HandoverNoteItem
{
    public int Id { get; set; }
    public int HandoverPatientId { get; set; }
    public string? Category { get; set; }
    public string? Content { get; set; }
    public int SortOrder { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class HandoverNoteUpsertRequest
{
    public int HandoverPatientId { get; set; }
    public string? Category { get; set; }
    public string? Content { get; set; }
    public int SortOrder { get; set; }
}
