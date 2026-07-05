using Microsoft.Data.SqlClient;

namespace WhiteboardSync.Jobs;

/// <summary>一個 ETL 工作：從來源(DB2_DUMP)清洗後寫入目標(本地 Whiteboard)。</summary>
public interface IEtlJob
{
    /// <summary>job 名稱（記錄用）。</summary>
    string Name { get; }

    /// <summary>執行一輪（連線已開啟，由呼叫端 using 釋放）。</summary>
    void Run(SqlConnection src, SqlConnection dst, AppConfig cfg, Logger log);
}
