using System.Text.Json;
using System.Text.Json.Serialization;

namespace DbSync;

/// <summary>整體設定（由 appsettings.json 載入）。</summary>
public sealed class AppConfig
{
    public string Db2ConnectionString { get; set; } = "";
    public string SqlConnectionString { get; set; } = "";
    public string StateDir { get; set; } = "state";
    public string LogDir { get; set; } = "logs";
    public int CommandTimeoutSeconds { get; set; } = 300;
    public List<TableSpec> Tables { get; set; } = new();

    /// <summary>由執行檔所在目錄讀取 appsettings.json。</summary>
    public static AppConfig Load()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        if (!File.Exists(path))
            throw new FileNotFoundException($"找不到設定檔 {path}（請由 appsettings.sample.json 複製並填入帳密）。");

        var opt = new JsonSerializerOptions { PropertyNameCaseInsensitive = true, ReadCommentHandling = JsonCommentHandling.Skip };
        var cfg = JsonSerializer.Deserialize<AppConfig>(File.ReadAllText(path), opt)
                  ?? throw new InvalidOperationException("appsettings.json 解析失敗。");

        if (string.IsNullOrWhiteSpace(cfg.SqlConnectionString)) throw new InvalidOperationException("缺少 SqlConnectionString。");
        // 相對路徑一律轉為以執行檔目錄為基準（Task Scheduler 的工作目錄不一定是執行檔目錄）
        cfg.StateDir = Rooted(cfg.StateDir);
        cfg.LogDir = Rooted(cfg.LogDir);
        return cfg;
    }

    private static string Rooted(string p) =>
        Path.IsPathRooted(p) ? p : Path.Combine(AppContext.BaseDirectory, p);
}

/// <summary>單一表的同步設定。</summary>
public sealed class TableSpec
{
    public string Schema { get; set; } = "";
    public string Name { get; set; } = "";
    public string Tier { get; set; } = "fast";          // fast | slow
    public string Mode { get; set; } = "incremental";   // incremental | full | append
    public string? WatermarkCol { get; set; }           // incremental/append 用（Z*）
    public List<string> KeyCols { get; set; } = new();  // 邏輯鍵
    public string? Filter { get; set; }                 // 可空 WHERE
    public bool Enabled { get; set; } = true;

    [JsonIgnore] public string FullName => $"[{Schema}].[{Name}]";
    [JsonIgnore] public string Key => $"{Schema}.{Name}";
}
