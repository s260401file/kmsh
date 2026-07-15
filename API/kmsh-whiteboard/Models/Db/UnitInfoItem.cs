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
    public string? ViewPassword { get; set; }        // OR 檢視密碼（4 位數；設定後前台切換非第一頁籤需輸入。NULL/空=不設限）
    public int? ViewTimeoutMinutes { get; set; }     // OR 檢視密碼有效分鐘（驗證後該台裝置記住；1–10，NULL=預設 3）
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
