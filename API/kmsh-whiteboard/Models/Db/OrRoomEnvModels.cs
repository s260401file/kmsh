using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>OR 刀房某日溫溼度一筆（鍵＝OpDate+RoomId）。</summary>
public class OrRoomEnvItem
{
    public int Id { get; set; }
    public DateTime OpDate { get; set; }
    public string RoomId { get; set; } = "";
    public decimal? Temperature { get; set; }
    public decimal? Humidity { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>OR 刀房溫溼度 新增/修改（依鍵 upsert；兩欄皆空＝刪除）。</summary>
public class OrRoomEnvUpsertRequest
{
    [Required] public string OpDate { get; set; } = "";   // yyyy-MM-dd
    [Required] public string RoomId { get; set; } = "";
    public decimal? Temperature { get; set; }
    public decimal? Humidity { get; set; }
}

/// <summary>批次存檔（後台一次送出該日所有變更的刀房）。</summary>
public class OrRoomEnvBatchRequest
{
    public List<OrRoomEnvUpsertRequest> Entries { get; set; } = new();
}
