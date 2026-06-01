using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(DataContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("registro")]
        public async Task<IActionResult> Registro([FromBody] RegistroDto request)
        {
            // 1. Validação de e-mail único
            var emailExiste = await _context.Usuarios.AnyAsync(u => u.Email == request.Email);
            if (emailExiste)
            {
                return BadRequest(new { message = "Este e-mail já está cadastrado." });
            }

            // 2. Criptografia da senha usando BCrypt
            string senhaHash = BCrypt.Net.BCrypt.HashPassword(request.Senha);

            // 3. Criação do objeto do usuário
            var novoUsuario = new Usuario
            {
                Nome = request.Nome,
                Email = request.Email,
                SenhaHash = senhaHash
            };

            // 4. Salvar no MySQL via EF Core
            _context.Usuarios.Add(novoUsuario);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Usuário cadastrado com sucesso!" });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto request)
        {
            // 1. Busca o usuário pelo e-mail
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Email == request.Email);
            
            // 2. Valida o usuário e a senha criptografada
            if (usuario == null || !BCrypt.Net.BCrypt.Verify(request.Senha, usuario.SenhaHash))
            {
                return Unauthorized(new { message = "E-mail ou senha inválidos." });
            }

            // 3. Gera o Token JWT
            var token = GerarTokenJwt(usuario);

            return Ok(new { 
                token = token, 
                usuario = new { usuario.Id, usuario.Nome, usuario.Email, usuario.Role } 
            });
        }

        private string GerarTokenJwt(Usuario usuario)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            
            // Tratamento preventivo para garantir que a chave JWT exista
            var secretKey = _configuration["JwtSettings:Secret"];
            if (string.IsNullOrEmpty(secretKey))
            {
                throw new InvalidOperationException("Erro Interno: A chave 'JwtSettings:Secret' não foi mapeada no ambiente.");
            }
            
            var chave = Encoding.ASCII.GetBytes(secretKey);

            // SEGURANÇA CONTRA ERRO 500: Tenta ler a configuração, se não achar, assume 60 minutos padrão
            var expirySetting = _configuration["JwtSettings:ExpiryInMinutes"];
            if (!double.TryParse(expirySetting, out double expiryMinutes))
            {
                expiryMinutes = 60; // Fallback seguro para não derrubar a API se o Docker esquecer o valor
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                    new Claim(ClaimTypes.Name, usuario.Nome),
                    new Claim(ClaimTypes.Email, usuario.Email),
                    new Claim(ClaimTypes.Role, usuario.Role ?? "User") // Evita nulo caso a Role não venha preenchida
                }),
                Expires = DateTime.UtcNow.AddMinutes(expiryMinutes), // Mapeado de forma segura
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(chave), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}