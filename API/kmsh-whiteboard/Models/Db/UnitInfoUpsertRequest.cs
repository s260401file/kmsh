using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

/// <summary>各站頁首單位資訊 新增/修改請求（後台；以 UnitCode 為鍵 upsert）。</summary>
public class UnitInfoUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "";
    public string? HospitalName { get; set; }
    public string? WardName { get; set; }
    public string? DirectorLabel { get; set; }
    public string? DirectorName { get; set; }
    public string? HeadNurseLabel { get; set; }
    public string? HeadNurseName { get; set; }
    public int? TotalBeds { get; set; }
}
