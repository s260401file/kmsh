using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// 「文字公告/佈告」更新請求 DTO（對應 TextItem）。
/// 管理後台修改既有公告/跑馬燈/佈告欄文字時送入的資料。
/// </summary>
public class TextUpdateRequest
{
    public string? Title { get; set; }                // 標題（可選）

    [Required]
    public string Content { get; set; } = "";         // 內文（必填）

    public string? Category { get; set; }             // 分類（如公告/跑馬燈/佈告欄）
    public string? UnitCode { get; set; }             // 所屬單位代碼（可選）
    public string? Priority { get; set; }             // 優先度（如一般/重要）
    public int SortOrder { get; set; } = 0;           // 顯示排序，預設 0
    public bool IsActive { get; set; } = true;        // 是否啟用，預設啟用
    public DateTime? StartAt { get; set; }            // 顯示起始時間（選填，null=不限）
    public DateTime? EndAt { get; set; }              // 顯示截止時間（選填，null=不限）
}
