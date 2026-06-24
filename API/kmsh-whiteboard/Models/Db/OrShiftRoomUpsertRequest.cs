using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>OR 手術派班-房×班 刷手/流動 新增/修改請求（後台 CRUD）。</summary>
public class OrShiftRoomUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "OR";
    [Required] public string ShiftType { get; set; } = "";
    [Required] public string RoomId { get; set; } = "";
    public string? ScrubNurse { get; set; }
    public string? CircNurse { get; set; }
    public string? Ext { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
