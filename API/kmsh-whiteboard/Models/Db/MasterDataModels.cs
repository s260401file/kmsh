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

/// <summary>照服員主檔一列（全院共用；姓名＋單一聯絡方式）。</summary>
public class CareAideItem
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Contact { get; set; }           // 聯絡方式（分機／電話，自由填）
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CareAideUpsertRequest
{
    public string Name { get; set; } = "";
    public string? Contact { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>某單位選取顯示的一位照服員（含順序；姓名／聯絡方式由 CareAide join 帶出）。</summary>
public class UnitCareAideItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";
    public int AideId { get; set; }
    public string? Name { get; set; }              // join CareAide
    public string? Contact { get; set; }           // join CareAide
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>某單位的照服員顯示選取批次存檔（覆寫該單位整組選取）。</summary>
public class UnitCareAideSaveRequest
{
    public List<UnitCareAideEntry> Entries { get; set; } = new();
}

public class UnitCareAideEntry
{
    public int AideId { get; set; }
    public int SortOrder { get; set; }
}
