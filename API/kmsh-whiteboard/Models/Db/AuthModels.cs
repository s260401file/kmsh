namespace kmsh_whiteboard.Models.Db;

/// <summary>登入請求：員編＋密碼（密碼交 LDAP 驗證；過渡期 LDAP 未啟用時密碼可空）。</summary>
public class LoginRequest
{
    public string? EmployeeNo { get; set; }
    public string? Password { get; set; }
}

/// <summary>登出請求：記錄登出稽核用。</summary>
public class LogoutRequest
{
    public string? EmployeeNo { get; set; }
}
