namespace kmsh_whiteboard.Settings;

public class KmuhApiOptions
{
    public const string Section = "KmuhApi";
    public string BaseUrl { get; set; } = "";
    public bool IgnoreSslErrors { get; set; } = false;
}
