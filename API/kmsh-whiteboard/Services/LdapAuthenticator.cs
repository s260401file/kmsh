using System.DirectoryServices.Protocols;
using System.Net;
using kmsh_whiteboard.Settings;
using Microsoft.Extensions.Options;

namespace kmsh_whiteboard.Services;

public interface ILdapAuthenticator
{
    bool Enabled { get; }
    /// <summary>以 LDAP bind 驗證帳密。Enabled=false 時回 true（過渡期由呼叫端走員編-only）。</summary>
    bool Authenticate(string employeeNo, string password, out string? error);
}

/// <summary>對 LLDAP／AD 做 LDAP bind 驗證（System.DirectoryServices.Protocols，跨平台）。</summary>
public class LdapAuthenticator : ILdapAuthenticator
{
    private readonly LdapOptions _opt;
    private readonly ILogger<LdapAuthenticator> _log;

    public LdapAuthenticator(IOptions<LdapOptions> opt, ILogger<LdapAuthenticator> log)
    {
        _opt = opt.Value;
        _log = log;
    }

    public bool Enabled => _opt.Enabled;

    public bool Authenticate(string employeeNo, string password, out string? error)
    {
        error = null;
        if (!_opt.Enabled) return true;                    // 過渡期：不驗密碼，交由呼叫端以員編查在職人員
        if (string.IsNullOrEmpty(password)) { error = "請輸入密碼"; return false; }
        if (string.IsNullOrWhiteSpace(_opt.Host)) { error = "LDAP 未設定主機"; return false; }

        var userDn = _opt.BindDnFormat.Replace("{uid}", employeeNo);
        try
        {
            using var conn = new LdapConnection(new LdapDirectoryIdentifier(_opt.Host, _opt.Port))
            {
                AuthType = AuthType.Basic,
                Timeout = TimeSpan.FromSeconds(_opt.TimeoutSeconds)
            };
            conn.SessionOptions.ProtocolVersion = 3;
            if (_opt.UseSsl) conn.SessionOptions.SecureSocketLayer = true;
            conn.Bind(new NetworkCredential(userDn, password));   // bind 成功＝帳密正確
            return true;
        }
        catch (LdapException ex)
        {
            _log.LogInformation("LDAP bind 失敗（{emp}）：{code} {msg}", employeeNo, ex.ErrorCode, ex.Message);
            error = "帳號或密碼錯誤";                       // 不外洩細節
            return false;
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "LDAP 連線異常（{emp}）", employeeNo);
            error = "無法連線認證伺服器";
            return false;
        }
    }
}
