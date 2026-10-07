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
        _map = Load(_path);
    }

    // 容錯讀取：浮水印檔損毀(空檔／殘留 NUL／半截 JSON，多因中斷寫入或斷電)時，
    // 不可讓整個同步掛掉 → 隔離壞檔、以空浮水印續跑(下次自目標現有最大值重新起算)。
    private static Dictionary<string, string> Load(string path)
    {
        if (!File.Exists(path)) return new();
        try
        {
            var text = File.ReadAllText(path);
            // 空檔／全空白／整檔 NUL(0x00) → 視為無浮水印
            if (string.IsNullOrWhiteSpace(text) || text.Trim('﻿', ' ', '\t', '\r', '\n', '\0').Length == 0)
                return new();
            return JsonSerializer.Deserialize<Dictionary<string, string>>(text) ?? new();
        }
        catch (Exception ex)
        {
            try
            {
                var bad = $"{path}.bad-{DateTime.Now:yyyyMMddHHmmss}";
                File.Move(path, bad);
                Console.Error.WriteLine($"[WatermarkStore] 浮水印檔損毀，已隔離為 {Path.GetFileName(bad)}，本輪以空浮水印續跑（下次自目標現有最大值重新起算）：{ex.Message}");
            }
            catch { /* 隔離失敗也不要讓同步掛掉 */ }
            return new();
        }
    }

    /// <summary>取回上次浮水印；無則回 null（呼叫端會以目標現有最大值初始化）。</summary>
    public DateTime? Get(string tableKey)
        => _map.TryGetValue(tableKey, out var v) && DateTime.TryParse(v, out var dt) ? dt : null;

    /// <summary>寫入並立即持久化（每表更新後即存，程式中途中止也不丟進度）。</summary>
    public void Set(string tableKey, DateTime value)
    {
        _map[tableKey] = value.ToString("yyyy-MM-ddTHH:mm:ss.fffffff");
        var json = JsonSerializer.Serialize(_map, new JsonSerializerOptions { WriteIndented = true });
        // 原子寫入：先寫 .tmp 再替換，避免中斷/斷電留下半截或 NUL 檔(本次損毀的成因)。
        var tmp = _path + ".tmp";
        File.WriteAllText(tmp, json);
        if (File.Exists(_path)) File.Replace(tmp, _path, null);
        else File.Move(tmp, _path);
    }
}
