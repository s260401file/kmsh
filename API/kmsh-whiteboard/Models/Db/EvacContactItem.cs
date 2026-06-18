using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// 自建 SQL Server「疏散(撤離)緊急聯絡人」資料表的一筆資料列。
/// 用於白板「疏散撤離」面板，列出緊急應變聯絡窗口。
/// </summary>
public class EvacContactItem
{
    public int Id { get; set; }                       // 主鍵（流水號）
    public string UnitCode { get; set; } = "";        // 所屬單位代碼
    public string Name { get; set; } = "";            // 緊急聯絡對象名稱
    public string Extension { get; set; } = "";       // 分機號碼
    public int SortOrder { get; set; }                // 顯示排序
    public bool IsActive { get; set; }                // 是否啟用
}

/// <summary>
/// 「疏散緊急聯絡人」新增/更新（Upsert）請求 DTO（對應 EvacContactItem）。
/// </summary>
public class EvacContactUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "";   // 所屬單位代碼（必填）
    [Required] public string Name { get; set; } = "";       // 緊急聯絡對象名稱（必填）
    [Required] public string Extension { get; set; } = "";  // 分機號碼（必填）
    public int SortOrder { get; set; } = 0;                 // 顯示排序，預設 0
    public bool IsActive { get; set; } = true;              // 是否啟用，預設啟用
}
