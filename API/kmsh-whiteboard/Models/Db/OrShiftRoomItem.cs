namespace kmsh_whiteboard.Models.Db;

/// <summary>OR 手術派班-房×班 刷手/流動 一筆（以 ShiftType＋RoomId 識別）。自建，後台維護。</summary>
public class OrShiftRoomItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "OR";
    public string ShiftType { get; set; } = "";        // 白班/小夜/大夜
    public string RoomId { get; set; } = "";           // OR-01…（對 OrRoom）
    public string? ScrubNurse { get; set; }            // 刷手護理師
    public string? CircNurse { get; set; }             // 流動護理師
    public string? Ext { get; set; }                   // 刀房分機
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
