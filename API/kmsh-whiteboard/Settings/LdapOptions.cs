namespace kmsh_whiteboard.Settings;

/// <summary>
/// LDAP／AD 認證設定（繫結 appsettings 的 "Ldap" 區段）。
/// 依 2026-07-02 會議：應用程式僅透過 LDAP 協定認證（帳密異動於 AD 端），
/// LDAP 建於 101 主機（LLDAP）；授權（單位/角色）仍以本地 StaffUnitRole 為準。
/// </summary>
public class LdapOptions
{
    public const string Section = "Ldap";

    /// <summary>是否啟用 LDAP 認證。false＝過渡期以員編登入（不驗密碼），待 LLDAP 就緒改 true。</summary>
    public bool Enabled { get; set; } = false;

    public string Host { get; set; } = "";              // LLDAP 主機（101，IP 待資訊室提供）
    public int Port { get; set; } = 389;                // 389=LDAP、636=LDAPS
    public bool UseSsl { get; set; } = false;           // 是否 LDAPS

    /// <summary>綁定 DN 樣板，{uid} 以登入員編代入，如 uid={uid},ou=people,dc=kmsh,dc=local。</summary>
    public string BindDnFormat { get; set; } = "uid={uid},ou=people,dc=example,dc=com";

    public int TimeoutSeconds { get; set; } = 8;
}
