namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// 自建「各科值班醫師」一筆（對應實體急診白板右半「各科值班醫師」）。
/// 一科一列，後台維護當日各科值班醫師/分機/員編；白板病室動態以面板顯示。
/// </summary>
public class ErOnCallDoctorItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";       // 單位（ER）
    public string DeptCode { get; set; } = "";        // 科別代碼（MED/GS/ORTH/NS/GYN/PS/PED/CRS/GU/CVS…）
    public string? DeptName { get; set; }             // 科別中文
    public string? DoctorName { get; set; }           // 值班醫師
    public string? Ext { get; set; }                  // 分機
    public string? EmpNo { get; set; }                // 員編
    public int SortOrder { get; set; }                // 顯示排序
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
