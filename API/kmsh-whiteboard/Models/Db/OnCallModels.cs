using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

// 各科值班醫師「每日輪值排程」模型（全院共用；顯示端日後接）。
// OnCallDept：科別層級設定（時段/規則/備註/聯絡）。OnCallRoster：每日×科別×時段 值班醫師。

/// <summary>科別層級設定（一科一列）。</summary>
public class OnCallDeptItem
{
    public int Id { get; set; }
    public string DeptCode { get; set; } = "";
    public string? DeptName { get; set; }
    public string? Slots { get; set; }            // 每日時段標籤逗號分隔；空=單一(全日)
    public string? CallOutRule { get; set; }       // 呼出/會診時段規則
    public string? Remark { get; set; }            // 備註（出國/月注記）
    public string? HolidayContact { get; set; }    // 假日緊急聯絡
    public string? Ext { get; set; }               // 預設分機
    public string? Mobile { get; set; }            // 預設手機/MVPN
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>科別層級設定 新增/修改請求。</summary>
public class OnCallDeptUpsertRequest
{
    [Required] public string DeptCode { get; set; } = "";
    public string? DeptName { get; set; }
    public string? Slots { get; set; }
    public string? CallOutRule { get; set; }
    public string? Remark { get; set; }
    public string? HolidayContact { get; set; }
    public string? Ext { get; set; }
    public string? Mobile { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>每日輪值一筆（某日某科某時段的值班醫師）。</summary>
public class OnCallRosterItem
{
    public int Id { get; set; }
    public string DeptCode { get; set; } = "";
    public DateTime OnCallDate { get; set; }
    public string? Slot { get; set; }
    public string? DoctorName { get; set; }
    public string? Ext { get; set; }
    public string? Mobile { get; set; }
    public string? EmpNo { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>每日輪值 新增/修改請求（單筆）。</summary>
public class OnCallRosterUpsertRequest
{
    [Required] public string DeptCode { get; set; } = "";
    [Required] public string OnCallDate { get; set; } = "";   // yyyy-MM-dd
    public string? Slot { get; set; }
    public string? DoctorName { get; set; }
    public string? Ext { get; set; }
    public string? Mobile { get; set; }
    public string? EmpNo { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>月曆整月存檔請求（覆寫該科該月）。</summary>
public class OnCallMonthSaveRequest
{
    [Required] public string DeptCode { get; set; } = "";
    public int Year { get; set; }
    public int Month { get; set; }
    public List<OnCallMonthEntry> Entries { get; set; } = new();
}

/// <summary>月曆整月存檔的單格。</summary>
public class OnCallMonthEntry
{
    [Required] public string OnCallDate { get; set; } = "";   // yyyy-MM-dd
    public string? Slot { get; set; }
    public string? DoctorName { get; set; }
    public string? Ext { get; set; }
    public string? Mobile { get; set; }
    public string? EmpNo { get; set; }
    public string? Note { get; set; }
    public int SortOrder { get; set; }
}

// ── 夜/假護理師值班表（NightNurseRoster；無科別、每日兩時段：小夜/小夜貳組）──

/// <summary>夜/假護理師某日某時段一列。</summary>
public class NightNurseItem
{
    public int Id { get; set; }
    public DateTime OnCallDate { get; set; }
    public string Slot { get; set; } = "";
    public string? Name { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>夜/假護理師月曆整月存檔請求（覆寫該月）。</summary>
public class NightNurseMonthSaveRequest
{
    public int Year { get; set; }
    public int Month { get; set; }
    public List<NightNurseEntry> Entries { get; set; } = new();
}

/// <summary>夜/假護理師月曆單格。</summary>
public class NightNurseEntry
{
    [Required] public string OnCallDate { get; set; } = "";   // yyyy-MM-dd
    public string Slot { get; set; } = "";
    public string? Name { get; set; }
    public int SortOrder { get; set; }
}
