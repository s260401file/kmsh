using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// 「文字公告/佈告」新增請求 DTO（對應 TextItem）。
/// 管理後台建立白板公告、跑馬燈或佈告欄文字時送入的資料。
/// </summary>
public class TextCreateRequest
{
    public string? Title { get; set; }                // 標題（可選）

    [Required]
    public string Content { get; set; } = "";         // 內文（必填）

    public string? Category { get; set; }             // 分類（如公告/跑馬燈/佈告欄）
    public string? UnitCode { get; set; }             // 所屬單位代碼（可選，全院公告可空）
    public string? Priority { get; set; }             // 優先度（如一般/重要）
    public int SortOrder { get; set; } = 0;           // 顯示排序，預設 0
}
