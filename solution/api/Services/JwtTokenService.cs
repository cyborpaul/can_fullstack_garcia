using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Sgcan.Api.Domain;

namespace Sgcan.Api.Services;

public class JwtTokenService(IConfiguration cfg)
{
    private readonly string _secret = cfg["JWT_SECRET"] ?? "dev-secret";
    private readonly string _issuer = cfg["JWT_ISSUER"] ?? "sgcan-api";
    private readonly string _aud = cfg["JWT_AUDIENCE"] ?? "sgcan-client";
    private readonly int _mins = int.TryParse(cfg["JWT_EXPIRES_MIN"], out var m) ? m : 120;

    public (string token, DateTime expiresAt) Generate(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expires = DateTime.UtcNow.AddMinutes(_mins);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Email)
        };

        var jwt = new JwtSecurityToken(
            issuer: _issuer,
            audience: _aud,
            claims: claims,
            expires: expires,
            signingCredentials: creds
        );

        var token = new JwtSecurityTokenHandler().WriteToken(jwt);
        return (token, expires);
    }
}
