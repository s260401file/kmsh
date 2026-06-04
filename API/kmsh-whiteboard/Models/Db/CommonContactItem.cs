namespace kmsh_whiteboard.Models.Db;

public class CommonContactItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";
    public string Name { get; set; } = "";
    public string Extension { get; set; } = "";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
}
