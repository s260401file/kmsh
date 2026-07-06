namespace kmsh_whiteboard.Models.Db;

// 全院共用主檔：科別 Department ＋ 醫師 Doctor（第6次會議 Action #8）。

/// <summary>科別主檔一列。</summary>
public class DepartmentItem
{
    public int Id { get; set; }
    public string Code { get; set; } = "";     // 科別代碼
    public string Name { get; set; } = "";     // 科別中文
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DepartmentUpsertRequest
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>醫師主檔一列（DeptName 由 Department join 帶出供顯示）。</summary>
public class DoctorItem
{
    public int Id { get; set; }
    public string EmployeeNo { get; set; } = "";   // 員編
    public string Name { get; set; } = "";
    public string? DeptCode { get; set; }          // 科別代碼（對應 Department.Code）
    public string? DeptName { get; set; }          // 科別中文（join 帶出）
    public string? Ext { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DoctorUpsertRequest
{
    public string EmployeeNo { get; set; } = "";
    public string Name { get; set; } = "";
    public string? DeptCode { get; set; }
    public string? Ext { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
