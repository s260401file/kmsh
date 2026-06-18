namespace kmsh_whiteboard.Settings;

/// <summary>
/// 高醫(KMUH) 外部 HIS API 連線設定（繫結 appsettings 的 "KmuhApi" 區段）。
/// </summary>
public class KmuhApiOptions
{
    public const string Section = "KmuhApi";          // appsettings 設定區段名稱
    public string BaseUrl { get; set; } = "";         // KMUH API 基底 URL
    public bool IgnoreSslErrors { get; set; } = false; // 是否略過 SSL 憑證錯誤（測試環境用）
}
