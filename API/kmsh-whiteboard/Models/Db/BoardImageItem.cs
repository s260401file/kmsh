namespace kmsh_whiteboard.Models.Db;

/// <summary>通用看板圖片一筆（以 Kind＋UnitCode 為鍵，每種類×每站至多一張）。目前用於 OR「各科協助業務」(Kind=assist)。</summary>
public class BoardImageItem
{
    public int Id { get; set; }
    public string Kind { get; set; } = "";
    public string UnitCode { get; set; } = "";
    public string ImagePath { get; set; } = "";
    public string? OrigName { get; set; }
    public DateTime UploadedAt { get; set; }
}
