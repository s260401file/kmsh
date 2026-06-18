using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// 自建 SQL Server「疏散(撤離)器材設備」資料表的一筆資料列。
/// 用於白板「疏散撤離」面板，列出各單位緊急疏散所需器材及存放位置。
/// </summary>
public class EvacEquipmentItem
{
    public int Id { get; set; }                       // 主鍵（流水號）
    public string UnitCode { get; set; } = "";        // 所屬單位代碼
    public string EquipmentName { get; set; } = "";   // 器材/設備名稱
    public string? Location { get; set; }             // 存放位置
    public int Quantity { get; set; }                 // 數量
    public int SortOrder { get; set; }                // 顯示排序
    public bool IsActive { get; set; }                // 是否啟用
}

/// <summary>
/// 「疏散器材設備」新增/更新（Upsert）請求 DTO（對應 EvacEquipmentItem）。
/// </summary>
public class EvacEquipmentUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "";       // 所屬單位代碼（必填）
    [Required] public string EquipmentName { get; set; } = "";  // 器材/設備名稱（必填）
    public string? Location { get; set; }                       // 存放位置
    public int Quantity { get; set; } = 1;                      // 數量，預設 1
    public int SortOrder { get; set; } = 0;                     // 顯示排序，預設 0
    public bool IsActive { get; set; } = true;                  // 是否啟用，預設啟用
}
