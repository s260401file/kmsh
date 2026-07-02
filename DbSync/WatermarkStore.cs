using System.Text.Json;

namespace DbSync;

/// <summary>
/// 浮水印狀態（每表最後同步到的 Z* 值），以 JSON 檔保存於 state/watermarks-{tier}.json。
/// 用本機檔而非目標 DB 控制表，避免污染資訊室的 DB2_DUMP。
/// </summary>
public sealed class WatermarkStore
{
    private readonly string _path;
    private readonly Dictionary<string, string> _map;

    public WatermarkStore(string stateDir, string tier)
    {
        Directory.CreateDirectory(stateDir);
        _path = Path.Combine(stateDir, $"watermarks-{tier}.json");
        _map = File.Exists(_path)
            ? JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(_path)) ?? new()
            : new();
    }

    /// <summary>取回上次浮水印；無則回 null（呼叫端會以目標現有最大值初始化）。</summary>
    public DateTime? Get(string tableKey)
        => _map.TryGetValue(tableKey, out var v) && DateTime.TryParse(v, out var dt) ? dt : null;

    /// <summary>寫入並立即持久化（每表更新後即存，程式中途中止也不丟進度）。</summary>
    public void Set(string tableKey, DateTime value)
    {
        _map[tableKey] = value.ToString("yyyy-MM-ddTHH:mm:ss.fffffff");
        File.WriteAllText(_path, JsonSerializer.Serialize(_map, new JsonSerializerOptions { WriteIndented = true }));
    }
}
