using kmsh_whiteboard.Models.Db;

namespace kmsh_whiteboard.Repositories;

public interface IEvacRepository
{
    // 圖片
    Task<EvacImageItem?> GetImageAsync(string unitCode, CancellationToken ct = default);
    Task UpsertImageAsync(string unitCode, string imagePath, string? origName, CancellationToken ct = default);
    Task<bool> DeleteImageAsync(string unitCode, CancellationToken ct = default);

    // 設備清單
    Task<IEnumerable<EvacEquipmentItem>> GetEquipmentAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    Task<EvacEquipmentItem?> GetEquipmentByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateEquipmentAsync(EvacEquipmentUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateEquipmentAsync(int id, EvacEquipmentUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteEquipmentAsync(int id, CancellationToken ct = default);

    // 緊急聯絡
    Task<IEnumerable<EvacContactItem>> GetContactAsync(string unitCode, bool includeAll = false, CancellationToken ct = default);
    Task<EvacContactItem?> GetContactByIdAsync(int id, CancellationToken ct = default);
    Task<int> CreateContactAsync(EvacContactUpsertRequest req, CancellationToken ct = default);
    Task<bool> UpdateContactAsync(int id, EvacContactUpsertRequest req, CancellationToken ct = default);
    Task<bool> DeleteContactAsync(int id, CancellationToken ct = default);
}
