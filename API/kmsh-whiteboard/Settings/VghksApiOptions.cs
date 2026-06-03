namespace kmsh_whiteboard.Settings;

public class VghksApiOptions
{
    public const string Section = "VghksApi";

    public string BaseUrl { get; set; } = "";
    public string KeyId { get; set; } = "";
    public string Hid { get; set; } = "";
    public string Apid { get; set; } = "";
    public bool IgnoreSslErrors { get; set; } = false;
}
