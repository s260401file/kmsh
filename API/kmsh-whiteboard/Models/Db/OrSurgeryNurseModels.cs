using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>逐台刀 刷手/流動/備註 覆蓋一筆（鍵＝OpDate+RoomId+ChartNo+OpTime）。</summary>
public class OrSurgeryNurseItem
{
    public int Id { get; set; }
    public DateTime OpDate { get; set; }
    public string RoomId { get; set; } = "";
    public string ChartNo { get; set; } = "";
    public string OpTime { get; set; } = "";
    public string? ScrubNurse { get; set; }
    public string? CircNurse { get; set; }
    public string? AnesNurse { get; set; }
    public string? Note { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>逐台刀 刷手/流動/備註 新增/修改（依鍵 upsert；三欄皆空＝刪除）。</summary>
public class OrSurgeryNurseUpsertRequest
{
    [Required] public string OpDate { get; set; } = "";   // yyyy-MM-dd
    [Required] public string RoomId { get; set; } = "";
    [Required] public string ChartNo { get; set; } = "";
    public string OpTime { get; set; } = "";
    public string? ScrubNurse { get; set; }
    public string? CircNurse { get; set; }
    public string? AnesNurse { get; set; }
    public string? Note { get; set; }
}

/// <summary>批次存檔（月曆後台一次送出所有變更的台刀）。</summary>
public class OrSurgeryNurseBatchRequest
{
    public List<OrSurgeryNurseUpsertRequest> Entries { get; set; } = new();
}
