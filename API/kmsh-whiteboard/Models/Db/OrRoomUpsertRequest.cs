using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>OR 刀房主檔 新增/修改請求（後台 CRUD）。以 UnitCode＋RoomId 識別刀房。</summary>
public class OrRoomUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "OR";
    [Required] public string RoomId { get; set; } = "";
    public string? ApiRoom { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
