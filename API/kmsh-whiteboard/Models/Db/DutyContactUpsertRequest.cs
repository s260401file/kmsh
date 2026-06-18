using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>
/// 「值班聯絡人」新增/更新（Upsert）請求 DTO。
/// 管理後台維護 DutyContactItem 時送入的資料。
/// </summary>
public class DutyContactUpsertRequest
{
    [Required]
    public string UnitCode { get; set; } = "";        // 所屬單位代碼（必填）
    public string? ShiftType { get; set; }            // 班別
    public string? TimeSlot { get; set; }             // 值班時段
    [Required]
    public string DutyTitle { get; set; } = "";       // 值班職稱（必填）
    [Required]
    public string Name { get; set; } = "";            // 值班人員姓名（必填）
    public string? Extension { get; set; }            // 分機號碼
    public string? Mobile { get; set; }               // 手機/行動電話
    public int SortOrder { get; set; } = 0;           // 顯示排序，預設 0
    public bool IsActive { get; set; } = true;        // 是否啟用，預設啟用
}
