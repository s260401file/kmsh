using Dapper;
using kmsh_whiteboard.Data;

namespace kmsh_whiteboard.Services;

/// <summary>
/// 讀取本地 [dbo].[Sync_Snapshot]（由 WhiteboardSync 定時把院方各 endpoint 落地成 JSON 快照）。
/// 顯示端一律讀本地快照，不再即時呼叫院方 Board_* API；院方短暫不通只會讓資料舊一點、不會空白。
/// 另提供「新鮮度」判斷供各站頁首顯示「資料可能延遲」。
/// </summary>
public sealed class SyncSnapshotStore
{
    private readonly DbConnectionFactory _factory;
    public SyncSnapshotStore(DbConnectionFactory factory) => _factory = factory;

    // 分頻門檻（分鐘）：high 每約 1 分同步 → 逾 3 分視為延遲；mid 每約 3 分 → 逾 9 分。
    private static readonly HashSet<string> HighEndpoints = new(StringComparer.OrdinalIgnoreCase)
        { "Board_bed", "Board_ER", "Board_ER_TypeE", "OR_SYSTEM" };
    private const int HighStaleMinutes = 3;
    private const int MidStaleMinutes = 9;

    public sealed record Snapshot(string? Payload, DateTime? SyncedAt, int RowCount);

    /// <summary>讀單一 endpoint 快照（payload＋同步時間）。表不存在或查無 → 空快照。</summary>
    public async Task<Snapshot> GetAsync(string endpoint, CancellationToken ct = default)
    {
        try
        {
            using var conn = _factory.Create();
            var row = await conn.QueryFirstOrDefaultAsync<(string? Payload, DateTime? SyncedAt, int RowCount)>(
                new CommandDefinition(
                    "SELECT [Payload], [SyncedAt], [RowCount] FROM [dbo].[Sync_Snapshot] WHERE [Endpoint]=@ep",
                    new { ep = endpoint }, cancellationToken: ct));
            return new Snapshot(row.Payload, row.SyncedAt, row.RowCount);
        }
        catch
        {
            // 表尚未建立（首輪同步前）等情況 → 空快照，看板照常回空、不中斷。
            return new Snapshot(null, null, 0);
        }
    }

    /// <summary>一次讀所有 endpoint 的同步時間，供跨表新鮮度判斷。</summary>
    public async Task<Dictionary<string, DateTime>> GetAllSyncedAtAsync(CancellationToken ct = default)
    {
        var map = new Dictionary<string, DateTime>(StringComparer.OrdinalIgnoreCase);
        try
        {
            using var conn = _factory.Create();
            var rows = await conn.QueryAsync<(string Endpoint, DateTime SyncedAt)>(
                new CommandDefinition("SELECT [Endpoint], [SyncedAt] FROM [dbo].[Sync_Snapshot]", cancellationToken: ct));
            foreach (var r in rows) map[r.Endpoint] = r.SyncedAt;
        }
        catch { /* 表未建立 → 空 map（視為延遲，交由呼叫端判斷） */ }
        return map;
    }

    private static int ThresholdMinutes(string endpoint) =>
        HighEndpoints.Contains(endpoint) ? HighStaleMinutes : MidStaleMinutes;

    /// <summary>指定 endpoint 是否延遲（查無同步時間亦視為延遲）。</summary>
    public static bool IsStale(IReadOnlyDictionary<string, DateTime> syncedAt, DateTime now, string endpoint)
        => !syncedAt.TryGetValue(endpoint, out var at) || (now - at).TotalMinutes > ThresholdMinutes(endpoint);

    /// <summary>任一來源 endpoint 延遲即回 true。</summary>
    public static bool AnyStale(IReadOnlyDictionary<string, DateTime> syncedAt, DateTime now, params string[] endpoints)
        => endpoints.Any(e => IsStale(syncedAt, now, e));

    /// <summary>來源 endpoint 中最舊的同步時間（皆無 → null）。</summary>
    public static DateTime? OldestSyncedAt(IReadOnlyDictionary<string, DateTime> syncedAt, params string[] endpoints)
    {
        DateTime? oldest = null;
        foreach (var e in endpoints)
            if (syncedAt.TryGetValue(e, out var at) && (oldest is null || at < oldest)) oldest = at;
        return oldest;
    }
}
