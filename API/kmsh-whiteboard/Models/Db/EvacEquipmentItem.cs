using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

public class EvacEquipmentItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";
    public string EquipmentName { get; set; } = "";
    public string? Location { get; set; }
    public int Quantity { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
}

public class EvacEquipmentUpsertRequest
{
    [Required] public string UnitCode { get; set; } = "";
    [Required] public string EquipmentName { get; set; } = "";
    public string? Location { get; set; }
    public int Quantity { get; set; } = 1;
    public int SortOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}
