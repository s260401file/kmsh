namespace kmsh_whiteboard.Settings;

public class VghksApiOptions
{
    public const string Section = "VghksApi";

    public string BaseUrl { get; set; } = "";
    /// <summary>MAASService 獨立基底 URL（#8-2，與 AMDR 不同主機）</summary>
    public string MaasBaseUrl { get; set; } = "";
    public string KeyId { get; set; } = "";
    public string Hid { get; set; } = "";
    public string Apid { get; set; } = "";
    public bool IgnoreSslErrors { get; set; } = false;
}
