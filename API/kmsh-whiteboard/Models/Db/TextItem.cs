namespace kmsh_whiteboard.Models.Db;

public class TextItem
{
    public int Id { get; set; }
    public string? Title { get; set; }
    public string Content { get; set; } = "";
    public string? Category { get; set; }
    public string? UnitCode { get; set; }
    public string? Priority { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
