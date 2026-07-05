using System.Text.Json;

namespace WhiteboardSync;

/// <summary>整體設定（由 appsettings.json 載入）。來源＝DB2_DUMP、目標＝本地 Whiteboard。</summary>
public sealed class AppConfig
{
    public string SourceConnectionString { get; set; } = "";   // 資訊室同步庫 DB2_DUMP
    public string TargetConnectionString { get; set; } = "";   // 本地白板庫 Whiteboard
    public string LogDir { get; set; } = "logs";
    public int CommandTimeoutSeconds { get; set; } = 120;
    public int WindowMonthsBack { get; set; } = 6;             // 今天回推幾個月為抽取下界（不設上界→含未來排程）

    /// <summary>由執行檔所在目錄讀取 appsettings.json。</summary>
    public static AppConfig Load()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        if (!File.Exists(path))
            throw new FileNotFoundException($"找不到設定檔 {path}（請由 appsettings.sample.json 複製並填入帳密）。");

        var opt = new JsonSerializerOptions { PropertyNameCaseInsensitive = true, ReadCommentHandling = JsonCommentHandling.Skip };
        var cfg = JsonSerializer.Deserialize<AppConfig>(File.ReadAllText(path), opt)
                  ?? throw new InvalidOperationException("appsettings.json 解析失敗。");

        if (string.IsNullOrWhiteSpace(cfg.SourceConnectionString)) throw new InvalidOperationException("缺少 SourceConnectionString。");
        if (string.IsNullOrWhiteSpace(cfg.TargetConnectionString)) throw new InvalidOperationException("缺少 TargetConnectionString。");
        if (cfg.WindowMonthsBack < 1) cfg.WindowMonthsBack = 6;
        // 相對路徑一律轉為以執行檔目錄為基準（Task Scheduler 的工作目錄不一定是執行檔目錄）
        cfg.LogDir = Rooted(cfg.LogDir);
        return cfg;
    }

    private static string Rooted(string p) =>
        Path.IsPathRooted(p) ? p : Path.Combine(AppContext.BaseDirectory, p);
}
