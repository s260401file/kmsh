using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

// 各單位「引用值班醫師」科別選取（UnitOnCallDept）：單位×科別×順序。
// 醫師姓名/分機不落地於此，顯示時由中央 OnCallRoster（當日值班）解析。

/// <summary>某單位選取的一個值班科別（含順序）。</summary>
public class UnitOnCallDeptItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";
    public string DeptCode { get; set; } = "";
    public string? DeptName { get; set; }        // join OnCallDept 帶出，供後台顯示
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>某單位的科別選取批次存檔（覆寫該單位整組選取）。</summary>
public class UnitOnCallDeptSaveRequest
{
    public List<UnitOnCallDeptEntry> Entries { get; set; } = new();
}

/// <summary>選取的單筆（科別＋顯示順序）。</summary>
public class UnitOnCallDeptEntry
{
    [Required] public string DeptCode { get; set; } = "";
    public int SortOrder { get; set; }
}
