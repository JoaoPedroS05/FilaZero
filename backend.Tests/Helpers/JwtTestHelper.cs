using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace backend.Tests.Helpers;

public static class JwtTestHelper
{
    private const string TestSecret = "ChaveDeTesteUltraSeguraParaJwtComMaisDe32Chars!!";
    private const int ExpiryMinutes = 60;

    public static IConfiguration BuildConfiguration() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtSettings:Secret"] = TestSecret,
                ["JwtSettings:ExpiryInMinutes"] = ExpiryMinutes.ToString()
            })
            .Build();

    public static string GenerateToken(Usuario usuario)
    {
        var handler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(TestSecret);

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                new Claim(ClaimTypes.Name, usuario.Nome),
                new Claim(ClaimTypes.Email, usuario.Email),
                new Claim(ClaimTypes.Role, usuario.Role ?? "User")
            }),
            Expires = DateTime.UtcNow.AddMinutes(ExpiryMinutes),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = handler.CreateToken(descriptor);
        return handler.WriteToken(token);
    }

    public static Usuario AdminUser() => new()
    {
        Id = 1,
        Nome = "Admin Teste",
        Email = "admin@teste.com",
        SenhaHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
        Role = "Admin"
    };

    public static Usuario ClientUser() => new()
    {
        Id = 2,
        Nome = "Cliente Teste",
        Email = "cliente@teste.com",
        SenhaHash = BCrypt.Net.BCrypt.HashPassword("senha123"),
        Role = "User"
    };
}