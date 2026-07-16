using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

// 值班表「聯絡電話」清單（比照常用電話 CommonContact，多一個可空的標題欄）。

/// <summary>聯絡電話一列（標題可空；前台顯示「標題 名稱 分機/電話」）。</summary>
public class ContactPhoneItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";
    public string? Title { get; set; }             // 標題（可空，如 書記/警衛）
    public string Name { get; set; } = "";         // 名稱
    public string? Extension { get; set; }         // 分機／電話
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
}

public class ContactPhoneUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "";
    public string? Title { get; set; }
    [Required] public string Name { get; set; } = "";
    public string? Extension { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
