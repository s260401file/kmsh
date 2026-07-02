using System.Diagnostics;

namespace DbSync;

/// <summary>依層別挑出啟用的表，逐表同步。每表獨立 try/catch：單表失敗不中斷其他表，最後彙整回報。</summary>
public sealed class SyncEngine
{
    private readonly AppConfig _cfg;
    private readonly Logger _log;

    public SyncEngine(AppConfig cfg, Logger log)
    {
        _cfg = cfg; _log = log;
    }

    /// <returns>失敗的表數（0 表示全成功）。</returns>
    public int Run(string tier, DateTime? sinceOverride = null)
    {
        var wm = new WatermarkStore(_cfg.StateDir, tier);
        var syncer = new TableSyncer(_cfg, wm, _log, sinceOverride);
        if (sinceOverride.HasValue) _log.Info($"（--reprocess：本輪自 {sinceOverride:yyyy-MM-dd HH:mm:ss} 起重新處理，忽略浮水印）");

        var tables = _cfg.Tables
            .Where(t => t.Enabled && string.Equals(t.Tier, tier, StringComparison.OrdinalIgnoreCase))
            .ToList();

        _log.Info($"===== 開始（tier={tier}）：{tables.Count} 張表 =====");
        var sw = Stopwatch.StartNew();
        int failed = 0;

        foreach (var t in tables)
        {
            var tsw = Stopwatch.StartNew();
            try
            {
                syncer.Sync(t);
            }
            catch (Exception ex)
            {
                failed++;
                // 單表失敗只記錄並續跑下一張，不讓其影響其他表
                _log.Error($"{t.Key}｜同步失敗（{tsw.ElapsedMilliseconds} ms）：{ex.Message}");
            }
        }

        _log.Info($"===== 結束（tier={tier}）：成功 {tables.Count - failed}／{tables.Count}，失敗 {failed}，耗時 {sw.Elapsed:hh\\:mm\\:ss} =====");
        return failed;
    }
}
