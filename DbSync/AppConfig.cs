using System.Text.Json;
using System.Text.Json.Serialization;

namespace DbSync;

// ═══════════════════════════════════════════════════════════════════════════
// AppConfig.cs — 設定模型(對應 appsettings.json)
// ---------------------------------------------------------------------------
// 資訊人員日常維護「要同步哪些表、用什麼方式」就是改 appsettings.json 的 Tables 陣列，
// 不必動程式。各欄位意義見下方 TableSpec 註解；範例見 appsettings.sample.json。
// appsettings.json 含實際帳密、已被 .gitignore 排除，請勿上傳版控。
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>整體設定（由 appsettings.json 載入）。</summary>
public sealed class AppConfig
{
    public string Db2ConnectionString { get; set; } = "";   // 來源：真實 DB2(HIS) 連線字串
    public string SqlConnectionString { get; set; } = "";   // 目標：SQL Server 的 DB2_DUMP 連線字串
    public string StateDir { get; set; } = "state";         // 浮水印檔存放目錄(相對路徑以執行檔目錄為基準)
    public string LogDir { get; set; } = "logs";            // 記錄檔存放目錄
    public int CommandTimeoutSeconds { get; set; } = 300;   // 單一 SQL 逾時秒數(大表首撈可能較久)
    public List<TableSpec> Tables { get; set; } = new();    // 要同步的表清單(逐表設定)

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

/// <summary>單一表的同步設定（appsettings.json 的 Tables 陣列每一筆）。</summary>
public sealed class TableSpec
{
    public string Schema { get; set; } = "";            // 來源/目標的 schema(如 AM、OR、ER)
    public string Name { get; set; } = "";              // 表名(如 HCASE_4A0)
    public string Tier { get; set; } = "fast";          // 執行層別：fast=每5分、slow=每30分/每晚(依排程設定)
    public string Mode { get; set; } = "incremental";   // 同步方式：replacekey(首選) | incremental | append | full。詳 TableSyncer
    public string? WatermarkCol { get; set; }           // 異動時間欄(Z*)；replacekey/incremental/append 必填、full 不用
    public List<string> KeyCols { get; set; } = new();  // 鍵：replacekey=案群組鍵(不需唯一)；incremental/append=須唯一鍵
    public string? Filter { get; set; }                 // 可選 WHERE 條件(不含 WHERE 字樣)；null=全部
    public bool Enabled { get; set; } = true;           // false=暫停此表(不同步)

    [JsonIgnore] public string FullName => $"[{Schema}].[{Name}]";  // 加中括號的完整表名，供組 SQL
    [JsonIgnore] public string Key => $"{Schema}.{Name}";           // 浮水印/記錄用的表識別鍵
}
