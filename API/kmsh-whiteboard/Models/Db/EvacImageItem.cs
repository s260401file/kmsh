namespace kmsh_whiteboard.Models.Db;

public class EvacImageItem
{
    public int Id { get; set; }
    public string UnitCode { get; set; } = "";
    public string ImagePath { get; set; } = "";
    public string? OrigName { get; set; }
    public DateTime UploadedAt { get; set; }
}
