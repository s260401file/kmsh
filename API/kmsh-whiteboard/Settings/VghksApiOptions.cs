namespace kmsh_whiteboard.Settings;

/// <summary>
/// 高榮(VGHKS) 外部 HIS API 連線設定（繫結 appsettings 的 "VghksApi" 區段）。
/// 含基底 URL 與呼叫所需的金鑰/識別參數。
/// </summary>
public class VghksApiOptions
{
    public const string Section = "VghksApi";         // appsettings 設定區段名稱

    public string BaseUrl { get; set; } = "";         // VGHKS API 基底 URL（多數介面）
    /// <summary>MAASService 獨立基底 URL（#8-2，與 AMDR 不同主機）</summary>
    public string MaasBaseUrl { get; set; } = "";
    public string KeyId { get; set; } = "";           // API 金鑰識別碼 KeyId
    public string Hid { get; set; } = "";             // 醫院/呼叫端識別碼 Hid
    public string Apid { get; set; } = "";            // 應用程式識別碼 Apid
    public bool IgnoreSslErrors { get; set; } = false; // 是否略過 SSL 憑證錯誤（測試環境用）
}
