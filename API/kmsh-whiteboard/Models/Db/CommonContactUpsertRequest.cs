using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// 「常用聯絡電話」新增/更新（Upsert）請求 DTO。
/// 管理後台維護 CommonContactItem 時送入的資料。
/// </summary>
public class CommonContactUpsertRequest
{
    [Required]
    public string UnitCode { get; set; } = "";        // 所屬單位代碼（必填）
    [Required]
    public string Name { get; set; } = "";            // 聯絡對象名稱（必填）
    [Required]
    public string Extension { get; set; } = "";       // 分機號碼（必填）
    public int SortOrder { get; set; } = 0;           // 顯示排序，預設 0
    public bool IsActive { get; set; } = true;        // 是否啟用，預設啟用
}
