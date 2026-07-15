using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

/// <summary>通用看板圖片存取（以 Kind＋UnitCode 為鍵）。</summary>
public interface IBoardImageRepository
{
    Task<BoardImageItem?> GetAsync(string kind, string unitCode, CancellationToken ct = default);
    Task UpsertAsync(string kind, string unitCode, string imagePath, string? origName, CancellationToken ct = default);
    Task<bool> DeleteAsync(string kind, string unitCode, CancellationToken ct = default);
}
