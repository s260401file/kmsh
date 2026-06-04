using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

public class CommonContactUpsertRequest
{
    [Required]
    public string UnitCode { get; set; } = "";
    [Required]
    public string Name { get; set; } = "";
    [Required]
    public string Extension { get; set; } = "";
    public int SortOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}
