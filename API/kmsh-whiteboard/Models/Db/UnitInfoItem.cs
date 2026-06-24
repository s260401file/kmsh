namespace kmsh_whiteboard.Models.Db;

/// <summary>各站白板頁首單位資訊（一站一列）：主任／護理 各以「標籤＋姓名」存，後台可編輯。</summary>
public class UnitInfoItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";
    public string? HospitalName { get; set; }
    public string? WardName { get; set; }
    public string? DirectorLabel { get; set; }     // 主任職稱（病房主任/手術室主任/急診主任）
    public string? DirectorName { get; set; }
    public string? HeadNurseLabel { get; set; }     // 護理職稱（單位護理長/護理長）
    public string? HeadNurseName { get; set; }
    public int? TotalBeds { get; set; }              // 總病床數覆寫（NULL=用預設；ER 急診統計用）
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
