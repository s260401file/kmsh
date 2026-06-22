namespace kmsh_whiteboard.Settings;

/// <summary>
/// 院方 Board API 連線設定（繫結 appsettings 的 "BoardApi" 區段）。
/// 對應主機 http://10.20.111.84:8088 的 Board_bed（住院在床）/ Board_ER（急診）端點。
/// </summary>
public class BoardApiOptions
{
    public const string Section = "BoardApi";          // appsettings 設定區段名稱

    public string BaseUrl { get; set; } = "";          // Board API 基底 URL（如 http://10.20.111.84:8088）
    public string ApiKey { get; set; } = "";           // x-api-key（Board_ER 需要；Board_bed 可留空）
    public bool IgnoreSslErrors { get; set; } = false; // 是否略過 SSL 憑證錯誤
}
