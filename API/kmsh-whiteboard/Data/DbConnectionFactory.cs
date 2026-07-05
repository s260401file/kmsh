using Microsoft.Data.SqlClient;

namespace kmsh_whiteboard.Data;

/// <summary>
/// SQL Server 連線工廠：集中管理自建白板資料庫（Whiteboard）的連線字串，
/// 供各 Repository 透過 Create() 取得新的 SqlConnection 使用。
/// </summary>
public class DbConnectionFactory
{
    private readonly string _connectionString;
    private readonly string? _db2DumpConnectionString;

    /// <summary>
    /// 建構子：從設定檔（appsettings 的 ConnectionStrings:Whiteboard）讀取連線字串；
    /// 若未設定則拋出例外，避免應用程式在缺少連線設定下啟動。
    /// 另讀選用的 ConnectionStrings:Db2Dump（資訊室同步庫），供直接讀 HIS 已同步表用。
    /// </summary>
    /// <param name="config">應用程式組態，用以讀取連線字串。</param>
    public DbConnectionFactory(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("Whiteboard")
            ?? throw new InvalidOperationException("連線字串 'Whiteboard' 未設定");
        _db2DumpConnectionString = config.GetConnectionString("Db2Dump");
    }

    /// <summary>建立並回傳一個新的 SqlConnection（未開啟）；呼叫端負責 using 釋放。</summary>
    public SqlConnection Create() => new(_connectionString);

    /// <summary>建立資訊室同步庫（DB2_DUMP）連線；未設定時拋出例外。呼叫端負責 using 釋放。</summary>
    public SqlConnection CreateDump() => new(_db2DumpConnectionString
        ?? throw new InvalidOperationException("連線字串 'Db2Dump' 未設定"));
}
