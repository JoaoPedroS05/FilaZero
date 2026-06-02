using backend.Controllers;
using backend.DTOs;
using backend.Models;
using backend.Tests.Helpers;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace backend.Tests.Controllers;

public class AuthControllerTests : IDisposable
{
    private readonly backend.Data.DataContext _context;
    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        _context = InMemoryDbFactory.Create();
        var config = JwtTestHelper.BuildConfiguration();
        _controller = new AuthController(_context, config);
    }

    public void Dispose() => _context.Dispose();

    // ─── REGISTRO ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Registro_ComDadosValidos_RetornaOk()
    {
        var dto = new RegistroDto
        {
            Nome = "João Silva",
            Email = "joao@email.com",
            Senha = "senha123"
        };

        var result = await _controller.Registro(dto);

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task Registro_ComDadosValidos_SalvaUsuarioNoBanco()
    {
        var dto = new RegistroDto
        {
            Nome = "Maria Souza",
            Email = "maria@email.com",
            Senha = "senha456"
        };

        await _controller.Registro(dto);

        var usuarioSalvo = _context.Usuarios.FirstOrDefault(u => u.Email == dto.Email);
        usuarioSalvo.Should().NotBeNull();
        usuarioSalvo!.Nome.Should().Be(dto.Nome);
    }

    [Fact]
    public async Task Registro_DeveSalvarSenhaComoHash_NaoEmTextoPlano()
    {
        var senhaOriginal = "minhaSenhaSecreta";
        var dto = new RegistroDto
        {
            Nome = "Hash Test",
            Email = "hash@email.com",
            Senha = senhaOriginal
        };

        await _controller.Registro(dto);

        var usuario = _context.Usuarios.First(u => u.Email == dto.Email);
        usuario.SenhaHash.Should().NotBe(senhaOriginal);
        BCrypt.Net.BCrypt.Verify(senhaOriginal, usuario.SenhaHash).Should().BeTrue();
    }

    [Fact]
    public async Task Registro_SemRoleInformada_AtribuiRoleUser()
    {
        var dto = new RegistroDto
        {
            Nome = "Sem Role",
            Email = "semrole@email.com",
            Senha = "abc123"
        };

        await _controller.Registro(dto);

        var usuario = _context.Usuarios.First(u => u.Email == dto.Email);
        usuario.Role.Should().Be("User");
    }

    [Fact]
    public async Task Registro_ComRoleAdmin_AtribuiRoleAdmin()
    {
        var dto = new RegistroDto
        {
            Nome = "Admin User",
            Email = "adminreg@email.com",
            Senha = "adminpass",
            Role = "Admin"
        };

        await _controller.Registro(dto);

        var usuario = _context.Usuarios.First(u => u.Email == dto.Email);
        usuario.Role.Should().Be("Admin");
    }

    [Fact]
    public async Task Registro_ComEmailJaCadastrado_RetornaBadRequest()
    {
        var dto = new RegistroDto
        {
            Nome = "Primeiro",
            Email = "duplicado@email.com",
            Senha = "senha123"
        };

        await _controller.Registro(dto); // 1ª vez — ok

        var resultado = await _controller.Registro(dto); // 2ª vez — duplicado

        resultado.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Registro_EmailDuplicado_MensagemDeErroCorreta()
    {
        var dto = new RegistroDto
        {
            Nome = "Dup",
            Email = "dup@email.com",
            Senha = "123456"
        };

        await _controller.Registro(dto);
        var resultado = (BadRequestObjectResult)await _controller.Registro(dto);

        var mensagem = resultado.Value?.ToString();
        mensagem.Should().Contain("e-mail");
    }

    // ─── LOGIN ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_ComCredenciaisValidas_RetornaOkComToken()
    {
        // Arrange — cria usuário via registro
        await _controller.Registro(new RegistroDto
        {
            Nome = "Login User",
            Email = "login@email.com",
            Senha = "pass123"
        });

        // Act
        var resultado = await _controller.Login(new LoginDto
        {
            Email = "login@email.com",
            Senha = "pass123"
        });

        // Assert
        resultado.Should().BeOfType<OkObjectResult>();

        var ok = (OkObjectResult)resultado;
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        json.Should().Contain("token");
    }

    [Fact]
    public async Task Login_ComSenhaErrada_RetornaUnauthorized()
    {
        await _controller.Registro(new RegistroDto
        {
            Nome = "Senha Errada",
            Email = "errada@email.com",
            Senha = "correta123"
        });

        var resultado = await _controller.Login(new LoginDto
        {
            Email = "errada@email.com",
            Senha = "senhaErrada"
        });

        resultado.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Login_ComEmailInexistente_RetornaUnauthorized()
    {
        var resultado = await _controller.Login(new LoginDto
        {
            Email = "inexistente@email.com",
            Senha = "qualquer"
        });

        resultado.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Login_TokenGerado_ContemDadosDoUsuario()
    {
        await _controller.Registro(new RegistroDto
        {
            Nome = "Token Check",
            Email = "tokencheck@email.com",
            Senha = "abc123"
        });

        var ok = (OkObjectResult)await _controller.Login(new LoginDto
        {
            Email = "tokencheck@email.com",
            Senha = "abc123"
        });

        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        json.Should().Contain("usuario");
        json.Should().Contain("tokencheck@email.com");
    }
}