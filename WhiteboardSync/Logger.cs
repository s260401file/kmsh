namespace WhiteboardSync;

/// <summary>極簡檔案 + 主控台記錄器。每日一檔：logs/whiteboardsync-{yyyyMMdd}.log。</summary>
public sealed class Logger : IDisposable
{
    private readonly StreamWriter _writer;
    private readonly object _gate = new();

    public Logger(string logDir)
    {
        Directory.CreateDirectory(logDir);
        var file = Path.Combine(logDir, $"whiteboardsync-{DateTime.Now:yyyyMMdd}.log");
        _writer = new StreamWriter(file, append: true) { AutoFlush = true };
    }

    public void Info(string msg) => Write("INFO", msg);
    public void Warn(string msg) => Write("WARN", msg);
    public void Error(string msg) => Write("ERROR", msg);

    private void Write(string level, string msg)
    {
        var line = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff} [{level}] {msg}";
        lock (_gate)
        {
            Console.WriteLine(line);
            _writer.WriteLine(line);
        }
    }

    public void Dispose() => _writer.Dispose();
}
