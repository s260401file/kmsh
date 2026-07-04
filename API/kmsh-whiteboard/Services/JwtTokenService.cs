using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using kmsh_whiteboard.Settings;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace kmsh_whiteboard.Services;

public interface IJwtTokenService
{
    /// <summary>簽發後台登入 JWT：sub=員編、name=姓名；管理員帶 role=Admin；可管理單位以多筆 unit claim 附帶。</summary>
    string CreateToken(int staffId, string employeeNo, string name, bool isAdmin, IEnumerable<string> units);
}

public class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _opt;
    public JwtTokenService(IOptions<JwtOptions> opt) => _opt = opt.Value;

    public string CreateToken(int staffId, string employeeNo, string name, bool isAdmin, IEnumerable<string> units)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, employeeNo),
            new("name", name),
            new("staffId", staffId.ToString()),
        };
        if (isAdmin) claims.Add(new Claim("role", "Admin"));
        claims.AddRange(units.Select(u => new Claim("unit", u)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opt.SigningKey));
        var token = new JwtSecurityToken(
            issuer: _opt.Issuer,
            audience: _opt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_opt.ExpiryMinutes),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
