using System.Runtime.InteropServices;
using Microsoft.Data.SqlClient;
using WhiteboardSync;
using WhiteboardSync.Jobs;

// ── 進入點 ───────────────────────────────────────────────────────────────
// 用法：WhiteboardSync.exe
//   把資訊室同步庫(DB2_DUMP)的資料「清洗」後落地到本地 Whiteboard，供白板/報表直接讀。
//   每次執行做一輪 ETL 後結束；排程請由 Windows 工作排程器觸發（間隔自訂）。
//   退出碼：0=全成功、1=有 job 失敗或發生例外（供排程器判讀）。
// 防重疊：具名 Mutex；若上一輪還沒跑完，本輪直接跳過（回 0）。
// 資源釋放：Mutex 於 finally 釋放；Logger 與各連線以 using 釋放。

int exitCode = 0;
bool noPause = args.Contains("--no-pause", StringComparer.OrdinalIgnoreCase);
int pauseSeconds = int.TryParse(GetArg(args, "--pause-seconds"), out var ps) ? ps : 15;

using var mutex = new Mutex(false, @"Global\WhiteboardSync", out _);
bool held = false;
try
{
    held = mutex.WaitOne(TimeSpan.Zero);   // 不等待：拿不到代表上一輪還在跑
    if (!held)
    {
        Console.WriteLine("[skip] 已有實例執行中，本輪跳過。");
        MaybePause(noPause, pauseSeconds);
        return 0;
    }

    AppConfig cfg;
    try { cfg = AppConfig.Load(); }
    catch (Exception ex) { Console.Error.WriteLine("設定載入失敗：" + ex.Message); MaybePause(noPause, pauseSeconds); return 1; }

    using var log = new Logger(cfg.LogDir);

    // 目前僅 OR 一個 job；日後可加其他單位 job 進此清單。
    var jobs = new IEtlJob[] { new OrSurgeryJob() };

    log.Info($"===== 開始：{jobs.Length} 個 job（窗={cfg.WindowMonthsBack} 個月）=====");
    var sw = System.Diagnostics.Stopwatch.StartNew();
    int failed = 0;

    foreach (var job in jobs)
    {
        var jsw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            using var src = new SqlConnection(cfg.SourceConnectionString);
            using var dst = new SqlConnection(cfg.TargetConnectionString);
            src.Open();
            dst.Open();
            job.Run(src, dst, cfg, log);
        }
        catch (Exception ex)
        {
            failed++;
            log.Error($"{job.Name}｜失敗（{jsw.ElapsedMilliseconds} ms）：{ex.Message}");
        }
    }

    log.Info($"===== 結束：成功 {jobs.Length - failed}／{jobs.Length}，失敗 {failed}，耗時 {sw.Elapsed:hh\\:mm\\:ss} =====");
    exitCode = failed == 0 ? 0 : 1;
}
catch (AbandonedMutexException)
{
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

// 雙擊 exe（獨立新視窗）時，跑完停住讓使用者確認結果；從既有終端機/排程執行時不停。
static void MaybePause(bool noPause, int seconds)
{
    try
    {
        if (noPause || seconds <= 0 || !Environment.UserInteractive || Console.IsOutputRedirected) return;
        if (!ConsoleUtil.LaunchedStandalone()) return;
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

    public static bool LaunchedStandalone()
    {
        var buf = new uint[4];
        uint n = GetConsoleProcessList(buf, (uint)buf.Length);
        return n <= 1;
    }
}
