using System.ComponentModel.DataAnnotations;

namespace kmsh_whiteboard.Models.Db;

public class TextCreateRequest
{
    public string? Title { get; set; }

    [Required]
    public string Content { get; set; } = "";

    public string? Category { get; set; }
    public string? UnitCode { get; set; }
    public string? Priority { get; set; }
    public int SortOrder { get; set; } = 0;
}
