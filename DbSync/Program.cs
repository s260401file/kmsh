using DbSync;
using System.Runtime.InteropServices;

// ── 進入點 ───────────────────────────────────────────────────────────────
// 用法：DbSync.exe --tier fast|slow
//   由 Windows 工作排程器每 5 分鐘(fast) / 30 分鐘(slow) 觸發。
//   退出碼：0=全成功、1=有表失敗或發生例外（供排程器判讀）。
// 防重疊：每層別一個具名 Mutex；若上一輪還沒跑完，本輪直接跳過（回 0）。
// 資源釋放：Mutex 於 finally 釋放；Logger 與各連線以 using 釋放；即使中途例外也保證釋放。

int exitCode = 0;
bool noPause = args.Contains("--no-pause", StringComparer.OrdinalIgnoreCase);
int pauseSeconds = int.TryParse(GetArg(args, "--pause-seconds"), out var ps) ? ps : 15;
DateTime? sinceOverride = double.TryParse(GetArg(args, "--reprocess-hours"), out var rh) ? DateTime.Now.AddHours(-rh) : null;
var tier = GetArg(args, "--tier")?.ToLowerInvariant() ?? "fast";
if (tier is not ("fast" or "slow"))
{
    Console.Error.WriteLine($"未知 --tier：{tier}（僅接受 fast 或 slow）");
    MaybePause(noPause, pauseSeconds);
    return 2;
}

// 具名 Mutex（Global 前綴：跨工作階段，機器層級唯一）
using var mutex = new Mutex(false, $@"Global\DbSync_{tier}", out _);
bool held = false;
try
{
    held = mutex.WaitOne(TimeSpan.Zero);   // 不等待：拿不到代表上一輪還在跑
    if (!held)
    {
        Console.WriteLine($"[skip] 已有 {tier} 實例執行中，本輪跳過。");
        MaybePause(noPause, pauseSeconds);
        return 0;
    }

    AppConfig cfg;
    try { cfg = AppConfig.Load(); }
    catch (Exception ex) { Console.Error.WriteLine("設定載入失敗：" + ex.Message); MaybePause(noPause, pauseSeconds); return 1; }

    using var log = new Logger(cfg.LogDir, tier);
    try
    {
        if (args.Contains("--inspect-keys", StringComparer.OrdinalIgnoreCase))
        {
            // 唯讀：只查 DB2 目錄印出各表真實主鍵/唯一索引，不做任何同步
            KeyInspector.Run(cfg, log);
        }
        else
        {
            var failed = new SyncEngine(cfg, log).Run(tier, sinceOverride);
            exitCode = failed == 0 ? 0 : 1;
        }
    }
    catch (Exception ex)
    {
        log.Error("執行期未預期例外：" + ex);
        exitCode = 1;
    }
}
catch (AbandonedMutexException)
{
    // 前一實例異常結束但仍取得了 Mutex；本實例已接手，視為持有並繼續。
    held = true;
    Console.Error.WriteLine("偵測到前一實例異常結束（AbandonedMutex），本輪接手。");
    exitCode = 1;
}
finally
{
    if (held) mutex.ReleaseMutex();
}

MaybePause(noPause, pauseSeconds);
return exitCode;

static string? GetArg(string[] args, string name)
{
    for (int i = 0; i < args.Length - 1; i++)
        if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
            return args[i + 1];
    return null;
}

// 雙擊 exe（獨立新視窗）時，跑完停住讓使用者確認結果：按任意鍵即關，或 N 秒後自動關閉。
// 從既有終端機執行、輸出被導向、或非互動（Task Scheduler「不論登入與否」）時不停，避免排程卡住。
// 可用 --no-pause 關閉此行為、--pause-seconds N 調整秒數（預設 15）。
static void MaybePause(bool noPause, int seconds)
{
    try
    {
        if (noPause || seconds <= 0 || !Environment.UserInteractive || Console.IsOutputRedirected) return;
        if (!ConsoleUtil.LaunchedStandalone()) return;   // 從既有終端機/排程繼承的主控台 → 不停
        Console.WriteLine();
        Console.WriteLine($"===== 執行結束：按任意鍵關閉，或 {seconds} 秒後自動關閉 =====");
        for (int i = 0; i < seconds * 10; i++)
        {
            if (Console.KeyAvailable) { Console.ReadKey(true); break; }
            Thread.Sleep(100);
        }
    }
    catch { /* 偵測失敗就不停，避免影響排程 */ }
}

static class ConsoleUtil
{
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern uint GetConsoleProcessList(uint[] processList, uint count);

    // 主控台僅本行程附著 → 判定為雙擊開啟的獨立視窗（非從 cmd/排程繼承）
    public static bool LaunchedStandalone()
    {
        var buf = new uint[4];
        uint n = GetConsoleProcessList(buf, (uint)buf.Length);
        return n <= 1;
    }
}
