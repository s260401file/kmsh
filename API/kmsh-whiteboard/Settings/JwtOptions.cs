namespace kmsh_whiteboard.Settings;

/// <summary>JWT 簽發設定（後台登入 token）。SigningKey 為 HMAC-SHA256 金鑰，至少 32 bytes。</summary>
public class JwtOptions
{
    public const string Section = "Jwt";

    public string SigningKey { get; set; } = "";
    public string Issuer { get; set; } = "kmsh-whiteboard";
    public string Audience { get; set; } = "kmsh-whiteboard";

    /// <summary>token 有效分鐘數（預設 12 小時，涵蓋一個班別；過期需重新登入）。</summary>
    public int ExpiryMinutes { get; set; } = 720;
}
