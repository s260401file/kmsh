namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// 自建「OR 刀房主檔」一筆（一房一列，以 UnitCode＋RoomId 為鍵）。
/// 做白板房號 RoomId(OR-01…) ↔ Board_OR 刀房代碼 ApiRoom(R1…) 對應與排序；
/// OR 手術動態照主檔鋪 4×2 房卡、Board_OR 手術以 ApiRoom merge 上去。後台可增刪改。
/// </summary>
public class OrRoomItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";       // 固定 OR
    public string RoomId { get; set; } = "";          // 白板房號（OR-01…OR-08）
    public string? ApiRoom { get; set; }              // Board_OR 刀房代碼（R1…R7）
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
