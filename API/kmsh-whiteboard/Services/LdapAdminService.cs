using System.DirectoryServices.Protocols;
using System.Text;
using kmsh_whiteboard.Settings;
using Microsoft.Extensions.Options;

namespace kmsh_whiteboard.Services;

/// <summary>AD LDS 帳號寫入（建帳號／重設密碼／啟用停用）。以 app pool 的 Windows 身分做
/// Negotiate + Sign &amp; Seal 綁定（免存服務帳密、免 LDAPS 憑證；設密碼需加密連線，sealed 即滿足）。
/// 前提：已授權 app pool 身分對 OU=people 有寫入/重設密碼權（dsacls Full Control）。</summary>
public interface ILdapAdminService
{
    bool Enabled { get; }
    /// <summary>建帳號＋設初始密碼＋啟用；已存在則只補設密碼＋啟用。失敗擲例外（訊息可對外）。</summary>
    void CreateUser(string employeeNo, string password);
    /// <summary>重設密碼（unicodePwd Replace）。</summary>
    void ResetPassword(string employeeNo, string password);
    /// <summary>啟用/停用帳號（msDS-UserAccountDisabled）。</summary>
    void SetEnabled(string employeeNo, bool enabled);
    /// <summary>員編變更 → AD 帳號改名（CN rename，沿用密碼）；舊帳號不存在則以新員編建立。</summary>
    void RenameUser(string oldEmployeeNo, string newEmployeeNo);
}

/// <summary>對外可顯示訊息的 LDAP 管理例外（如密碼不符原則、帳號已存在）。</summary>
public class LdapAdminException : Exception
{
    public LdapAdminException(string message, Exception? inner = null) : base(message, inner) { }
}

public class LdapAdminService : ILdapAdminService
{
    private readonly LdapOptions _opt;
    private readonly ILogger<LdapAdminService> _log;

    public LdapAdminService(IOptions<LdapOptions> opt, ILogger<LdapAdminService> log)
    {
        _opt = opt.Value;
        _log = log;
    }

    public bool Enabled => _opt.Enabled;

    private string UserDn(string employeeNo) => _opt.BindDnFormat.Replace("{uid}", employeeNo);

    private LdapConnection Connect()
    {
        var conn = new LdapConnection(new LdapDirectoryIdentifier(_opt.Host, _opt.Port))
        {
            AuthType = AuthType.Negotiate,   // 以 app pool Windows 身分綁定
            Timeout = TimeSpan.FromSeconds(_opt.TimeoutSeconds),
        };
        conn.SessionOptions.ProtocolVersion = 3;
        conn.SessionOptions.Signing = true;
        conn.SessionOptions.Sealing = true;   // 加密通道（設密碼必需；免 LDAPS）
        conn.Bind();
        return conn;
    }

    public void CreateUser(string employeeNo, string password)
    {
        var dn = UserDn(employeeNo);
        try
        {
            using var conn = Connect();
            if (!Exists(conn, dn))
                conn.SendRequest(new AddRequest(dn, new DirectoryAttribute("objectClass", "user")));
            SetPassword(conn, dn, password);
            SetDisabled(conn, dn, false);
        }
        catch (LdapAdminException) { throw; }
        catch (Exception ex) { throw Wrap("建立 AD 帳號失敗", employeeNo, ex); }
    }

    public void ResetPassword(string employeeNo, string password)
    {
        var dn = UserDn(employeeNo);
        try { using var conn = Connect(); SetPassword(conn, dn, password); }
        catch (LdapAdminException) { throw; }
        catch (Exception ex) { throw Wrap("重設密碼失敗", employeeNo, ex); }
    }

    public void SetEnabled(string employeeNo, bool enabled)
    {
        var dn = UserDn(employeeNo);
        try
        {
            using var conn = Connect();
            if (!Exists(conn, dn)) return;   // 沒有 AD 帳號就不動作
            SetDisabled(conn, dn, !enabled);
        }
        catch (Exception ex) { throw Wrap(enabled ? "啟用帳號失敗" : "停用帳號失敗", employeeNo, ex); }
    }

    public void RenameUser(string oldEmployeeNo, string newEmployeeNo)
    {
        if (string.Equals(oldEmployeeNo, newEmployeeNo, StringComparison.OrdinalIgnoreCase)) return;
        var oldDn = UserDn(oldEmployeeNo);
        try
        {
            using var conn = Connect();
            if (!Exists(conn, oldDn)) { CreateUser(newEmployeeNo, $"Kmsh@{newEmployeeNo}"); return; }   // 舊帳號不在→建新
            var parent = oldDn.Substring(oldDn.IndexOf(',') + 1);   // OU=people,DC=kmsh,DC=local
            conn.SendRequest(new ModifyDNRequest(oldDn, parent, $"CN={newEmployeeNo}"));
        }
        catch (LdapAdminException) { throw; }
        catch (Exception ex) { throw Wrap("變更員編（AD 改名）失敗", $"{oldEmployeeNo}→{newEmployeeNo}", ex); }
    }

    // ── 內部 ──
    private static bool Exists(LdapConnection conn, string dn)
    {
        try { conn.SendRequest(new SearchRequest(dn, "(objectClass=*)", SearchScope.Base, "cn")); return true; }
        catch (DirectoryOperationException) { return false; }   // NoSuchObject
    }

    private static void SetPassword(LdapConnection conn, string dn, string password)
    {
        // AD(LDS) 設密碼：unicodePwd＝UTF-16LE 前後加雙引號的位元組，Replace。
        var bytes = Encoding.Unicode.GetBytes("\"" + password + "\"");
        var mod = new DirectoryAttributeModification { Name = "unicodePwd", Operation = DirectoryAttributeOperation.Replace };
        mod.Add(bytes);
        conn.SendRequest(new ModifyRequest(dn, mod));
    }

    private static void SetDisabled(LdapConnection conn, string dn, bool disabled)
    {
        var mod = new DirectoryAttributeModification { Name = "msDS-UserAccountDisabled", Operation = DirectoryAttributeOperation.Replace };
        mod.Add(disabled ? "TRUE" : "FALSE");
        conn.SendRequest(new ModifyRequest(dn, mod));
    }

    private LdapAdminException Wrap(string what, string emp, Exception ex)
    {
        _log.LogWarning(ex, "{What}（{Emp}）", what, emp);
        // 設密碼被拒多為「不符複雜度原則」；其餘回一般訊息（不外洩細節）。
        var msg = ex.Message.Contains("WILL_NOT_PERFORM", StringComparison.OrdinalIgnoreCase)
                  || ex.Message.Contains("constraint", StringComparison.OrdinalIgnoreCase)
            ? $"{what}：密碼不符原則（長度/複雜度）"
            : what;
        return new LdapAdminException(msg, ex);
    }
}
