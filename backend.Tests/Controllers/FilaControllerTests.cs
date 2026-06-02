using backend.Controllers;
using backend.Data;
using backend.DTOs;
using backend.Hubs;
using backend.Models;
using backend.Services;
using backend.Tests.Helpers;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Distributed;
using Moq;
using System.Security.Claims;
using Xunit;

namespace backend.Tests.Controllers;

/// <summary>
/// Testes unitários para FilaController.
/// SignalR, GoogleMapsService e IDistributedCache são mockados.
/// </summary>
public class FilaControllerTests : IDisposable
{
    private readonly DataContext _context;
    private readonly FilaController _controller;
    private readonly Mock<IHubContext<FilaHub>> _hubMock;
    private readonly Mock<IDistributedCache> _cacheMock;

    public FilaControllerTests()
    {
        _context = InMemoryDbFactory.Create();

        _hubMock = new Mock<IHubContext<FilaHub>>();
        // configura SendAsync para não lançar exceção
        var clientsMock = new Mock<IHubClients>();
        var clientProxyMock = new Mock<IClientProxy>();
        clientsMock.Setup(c => c.All).Returns(clientProxyMock.Object);
        _hubMock.Setup(h => h.Clients).Returns(clientsMock.Object);

        _cacheMock = new Mock<IDistributedCache>();

        var googleMapsMock = new Mock<GoogleMapsService>(
            Mock.Of<HttpClient>(),
            JwtTestHelper.BuildConfiguration());

        _controller = new FilaController(
            _context,
            _hubMock.Object,
            googleMapsMock.Object,
            _cacheMock.Object);
    }

    public void Dispose() => _context.Dispose();

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /// <summary>Injeta claims de usuário autenticado no controlador.</summary>
    private void SetUser(int userId, string role = "User")
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity)
            }
        };
    }

    private async Task<Usuario> SeedUsuario(int id = 10, string role = "User")
    {
        var u = new Usuario
        {
            Id = id,
            Nome = $"User {id}",
            Email = $"user{id}@test.com",
            SenhaHash = BCrypt.Net.BCrypt.HashPassword("test"),
            Role = role
        };
        _context.Usuarios.Add(u);
        await _context.SaveChangesAsync();
        return u;
    }

    private async Task<Fila> SeedFila(bool ehPublica = true, bool ativa = true)
    {
        var fila = new Fila
        {
            Nome = "Fila Teste",
            TipoServico = "Atendimento Geral",
            TempoMedioAtendimento = 5,
            Ativa = ativa,
            EhPublica = ehPublica,
            CodigoAcesso = ehPublica ? string.Empty : Guid.NewGuid().ToString()[..8],
            Latitude = -8.0,
            Longitude = -34.9
        };
        _context.Filas.Add(fila);
        await _context.SaveChangesAsync();
        return fila;
    }

    private async Task<Guiche> SeedGuiche(int id = 1)
    {
        var guiche = new Guiche { Id = id, NumeroOuNome = $"Guichê {id:D2}", Ativo = true };
        _context.Guiches.Add(guiche);
        await _context.SaveChangesAsync();
        return guiche;
    }

    // ─── ListarFilas ──────────────────────────────────────────────────────────

    [Fact]
    public async Task ListarFilas_SemFilas_RetornaListaVazia()
    {
        var result = await _controller.ListarFilas();
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeAssignableTo<IEnumerable<Fila>>();
        ((IEnumerable<Fila>)ok.Value!).Should().BeEmpty();
    }

    [Fact]
    public async Task ListarFilas_ComFilasAtivas_RetornaSomentesAtivas()
    {
        await SeedFila(ativa: true);
        await SeedFila(ativa: false); // deve ser excluída

        var ok = (OkObjectResult)await _controller.ListarFilas();
        var filas = (IEnumerable<Fila>)ok.Value!;
        filas.Should().HaveCount(1);
        filas.All(f => f.Ativa).Should().BeTrue();
    }

    // ─── ListarFilasPublicas ─────────────────────────────────────────────────

    [Fact]
    public async Task ListarFilasPublicas_RetornaSomentePublicasAtivas()
    {
        await SeedFila(ehPublica: true);
        await SeedFila(ehPublica: false); // privada — não deve aparecer

        var ok = (OkObjectResult)await _controller.ListarFilasPublicas();
        var filas = (IEnumerable<Fila>)ok.Value!;
        filas.Should().HaveCount(1);
        filas.All(f => f.EhPublica).Should().BeTrue();
    }

    // ─── CriarFila ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CriarFila_ComDadosValidos_RetornaOk()
    {
        SetUser(1, "Admin");
        var dto = new CriarFilaDto
        {
            Nome = "Triagem",
            TipoServico = "Médico",
            TempoMedioAtendimento = 10,
            EhPublica = true
        };

        var result = await _controller.CriarFila(dto);
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task CriarFila_FilaPrivada_GeraCodigoAcesso()
    {
        SetUser(1, "Admin");
        var dto = new CriarFilaDto
        {
            Nome = "Privada",
            TipoServico = "Exame",
            TempoMedioAtendimento = 15,
            EhPublica = false
        };

        var ok = (OkObjectResult)await _controller.CriarFila(dto);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        // O código de acesso deve ter sido gerado (8 chars do Guid)
        var fila = _context.Filas.First(f => f.Nome == "Privada");
        fila.CodigoAcesso.Should().NotBeNullOrEmpty();
        fila.CodigoAcesso.Length.Should().Be(8);
    }

    [Fact]
    public async Task CriarFila_FilaPublica_CodigoAcessoVazio()
    {
        SetUser(1, "Admin");
        var dto = new CriarFilaDto
        {
            Nome = "Publica",
            TipoServico = "Geral",
            TempoMedioAtendimento = 5,
            EhPublica = true
        };

        await _controller.CriarFila(dto);

        var fila = _context.Filas.First(f => f.Nome == "Publica");
        fila.CodigoAcesso.Should().BeEmpty();
    }

    [Fact]
    public async Task CriarFila_SalvaLatitudeLongitude()
    {
        SetUser(1, "Admin");
        var dto = new CriarFilaDto
        {
            Nome = "Com GPS",
            TipoServico = "Geral",
            TempoMedioAtendimento = 5,
            EhPublica = true,
            Latitude = -8.05,
            Longitude = -34.88
        };

        await _controller.CriarFila(dto);

        var fila = _context.Filas.First(f => f.Nome == "Com GPS");
        fila.Latitude.Should().BeApproximately(-8.05, 0.001);
        fila.Longitude.Should().BeApproximately(-34.88, 0.001);
    }

    // ─── EntrarNaFila ─────────────────────────────────────────────────────────

    [Fact]
    public async Task EntrarNaFila_PrimeiroUsuario_RecebePosicao1()
    {
        var usuario = await SeedUsuario(20);
        var fila = await SeedFila();
        SetUser(usuario.Id);

        var result = await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });

        result.Should().BeOfType<OkObjectResult>();
        var atendimento = _context.Atendimentos.First(a => a.UsuarioId == usuario.Id);
        atendimento.Posicao.Should().Be(1);
    }

    [Fact]
    public async Task EntrarNaFila_SegundoUsuario_RecebePosicao2()
    {
        var u1 = await SeedUsuario(21);
        var u2 = await SeedUsuario(22);
        var fila = await SeedFila();

        SetUser(u1.Id);
        await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });

        SetUser(u2.Id);
        await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });

        var atendimento2 = _context.Atendimentos.First(a => a.UsuarioId == u2.Id);
        atendimento2.Posicao.Should().Be(2);
    }

    [Fact]
    public async Task EntrarNaFila_UsuarioJaNaFila_RetornaBadRequest()
    {
        var usuario = await SeedUsuario(30);
        var fila = await SeedFila();
        SetUser(usuario.Id);

        await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });
        var resultado = await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });

        resultado.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task EntrarNaFila_FilaInexistente_RetornaBadRequest()
    {
        var usuario = await SeedUsuario(31);
        SetUser(usuario.Id);

        var resultado = await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = 9999 });

        resultado.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task EntrarNaFila_SenhaTem3CharsDoNome()
    {
        var usuario = await SeedUsuario(32);
        var fila = await SeedFila();
        SetUser(usuario.Id);

        await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });

        var atendimento = _context.Atendimentos.First(a => a.UsuarioId == usuario.Id);
        var prefixoEsperado = fila.Nome[..3].ToUpper();
        atendimento.Senha.Should().StartWith(prefixoEsperado);
    }

    [Fact]
    public async Task EntrarNaFila_StatusInicial_EhAguardando()
    {
        var usuario = await SeedUsuario(33);
        var fila = await SeedFila();
        SetUser(usuario.Id);

        await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });

        var atendimento = _context.Atendimentos.First(a => a.UsuarioId == usuario.Id);
        atendimento.Status.Should().Be("Aguardando");
    }

    // ─── SairDaFila ──────────────────────────────────────────────────────────

    [Fact]
    public async Task SairDaFila_ComTicketAtivo_RetornaOk()
    {
        var usuario = await SeedUsuario(40);
        var fila = await SeedFila();
        SetUser(usuario.Id);

        await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });
        var resultado = await _controller.SairDaFila(new EntrarFilaDto { FilaId = fila.Id });

        resultado.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task SairDaFila_CancelaTicketEAjustaPosicoes()
    {
        var u1 = await SeedUsuario(41);
        var u2 = await SeedUsuario(42);
        var u3 = await SeedUsuario(43);
        var fila = await SeedFila();

        SetUser(u1.Id);
        await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });

        SetUser(u2.Id);
        await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });

        SetUser(u3.Id);
        await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });

        // u1 sai (posição 1)
        SetUser(u1.Id);
        await _controller.SairDaFila(new EntrarFilaDto { FilaId = fila.Id });

        // u2 deve estar na posição 1, u3 na posição 2
        var at2 = _context.Atendimentos.First(a => a.UsuarioId == u2.Id);
        var at3 = _context.Atendimentos.First(a => a.UsuarioId == u3.Id);

        at2.Posicao.Should().Be(1);
        at3.Posicao.Should().Be(2);
    }

    [Fact]
    public async Task SairDaFila_SemTicketAtivo_RetornaNotFound()
    {
        var usuario = await SeedUsuario(44);
        var fila = await SeedFila();
        SetUser(usuario.Id);

        var resultado = await _controller.SairDaFila(new EntrarFilaDto { FilaId = fila.Id });
        resultado.Should().BeOfType<NotFoundObjectResult>();
    }

    // ─── RemoverFila ─────────────────────────────────────────────────────────

    [Fact]
    public async Task RemoverFila_FilaExistente_MarcaComoInativa()
    {
        SetUser(1, "Admin");
        var fila = await SeedFila();

        await _controller.RemoverFila(fila.Id);

        _context.Filas.Find(fila.Id)!.Ativa.Should().BeFalse();
    }

    [Fact]
    public async Task RemoverFila_CancelaAtendimentosAtivos()
    {
        SetUser(1, "Admin");
        var usuario = await SeedUsuario(50);
        var fila = await SeedFila();

        // Entra na fila antes de remover
        SetUser(usuario.Id);
        await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });

        SetUser(1, "Admin");
        await _controller.RemoverFila(fila.Id);

        var atendimento = _context.Atendimentos.First(a => a.UsuarioId == usuario.Id);
        atendimento.Status.Should().Be("Cancelado");
    }

    [Fact]
    public async Task RemoverFila_FilaInexistente_RetornaNotFound()
    {
        SetUser(1, "Admin");
        var resultado = await _controller.RemoverFila(9999);
        resultado.Should().BeOfType<NotFoundObjectResult>();
    }

    // ─── ChamarProximaSenha ──────────────────────────────────────────────────

    [Fact]
    public async Task ChamarProximaSenha_ComFila_ChamaOPrimeiro()
    {
        SetUser(1, "Admin");
        var u1 = await SeedUsuario(60);
        var u2 = await SeedUsuario(61);
        var fila = await SeedFila();
        var guiche = await SeedGuiche(10);

        SetUser(u1.Id);
        await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });

        SetUser(u2.Id);
        await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });

        SetUser(1, "Admin");
        await _controller.ChamarProximaSenha(new ChamarSenhaDto { FilaId = fila.Id, GuicheId = guiche.Id });

        var at1 = _context.Atendimentos.First(a => a.UsuarioId == u1.Id);
        at1.Status.Should().Be("Chamado");
    }

    [Fact]
    public async Task ChamarProximaSenha_FilaVazia_RetornaNotFound()
    {
        SetUser(1, "Admin");
        var fila = await SeedFila();
        var guiche = await SeedGuiche(11);

        var resultado = await _controller.ChamarProximaSenha(
            new ChamarSenhaDto { FilaId = fila.Id, GuicheId = guiche.Id });

        resultado.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task ChamarProximaSenha_AvancaPosicoesDosRestantes()
    {
        SetUser(1, "Admin");
        var u1 = await SeedUsuario(70);
        var u2 = await SeedUsuario(71);
        var u3 = await SeedUsuario(72);
        var fila = await SeedFila();
        var guiche = await SeedGuiche(12);

        foreach (var uid in new[] { u1.Id, u2.Id, u3.Id })
        {
            SetUser(uid);
            await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });
        }

        SetUser(1, "Admin");
        await _controller.ChamarProximaSenha(new ChamarSenhaDto { FilaId = fila.Id, GuicheId = guiche.Id });

        var at2 = _context.Atendimentos.First(a => a.UsuarioId == u2.Id);
        var at3 = _context.Atendimentos.First(a => a.UsuarioId == u3.Id);

        at2.Posicao.Should().Be(1);
        at3.Posicao.Should().Be(2);
    }

    // ─── ObterFilaPrivada ─────────────────────────────────────────────────────

    [Fact]
    public async Task ObterFilaPrivada_CodigoValido_RetornaFila()
    {
        SetUser(1);
        var fila = await SeedFila(ehPublica: false);

        var resultado = await _controller.ObterFilaPrivada(fila.CodigoAcesso);

        resultado.Should().BeOfType<OkObjectResult>();
        var ok = (OkObjectResult)resultado;
        ((Fila)ok.Value!).Id.Should().Be(fila.Id);
    }

    [Fact]
    public async Task ObterFilaPrivada_CodigoInvalido_RetornaNotFound()
    {
        SetUser(1);
        var resultado = await _controller.ObterFilaPrivada("invalido");
        resultado.Should().BeOfType<NotFoundObjectResult>();
    }

    // ─── FinalizarTicket ──────────────────────────────────────────────────────

    [Fact]
    public async Task FinalizarTicket_TicketExistente_MarcaFinalizado()
    {
        SetUser(1);
        var usuario = await SeedUsuario(80);
        var fila = await SeedFila();

        SetUser(usuario.Id);
        await _controller.EntrarNaFila(new EntrarFilaDto { FilaId = fila.Id });
        var atendimento = _context.Atendimentos.First(a => a.UsuarioId == usuario.Id);

        SetUser(usuario.Id);
        await _controller.FinalizarTicket(new FinalizarTicketDto { AtendimentoId = atendimento.Id });

        _context.Atendimentos.Find(atendimento.Id)!.Status.Should().Be("Finalizado");
    }

    [Fact]
    public async Task FinalizarTicket_IdInvalido_RetornaBadRequest()
    {
        SetUser(1);
        var resultado = await _controller.FinalizarTicket(new FinalizarTicketDto { AtendimentoId = 0 });
        resultado.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task FinalizarTicket_TicketInexistente_RetornaNotFound()
    {
        SetUser(1);
        var resultado = await _controller.FinalizarTicket(new FinalizarTicketDto { AtendimentoId = 9999 });
        resultado.Should().BeOfType<NotFoundObjectResult>();
    }

    // ─── ListarGuiches ────────────────────────────────────────────────────────

    [Fact]
    public async Task ListarGuiches_RetornaSomenteAtivos()
    {
        _context.Guiches.Add(new Guiche { NumeroOuNome = "Ativo", Ativo = true });
        _context.Guiches.Add(new Guiche { NumeroOuNome = "Inativo", Ativo = false });
        await _context.SaveChangesAsync();

        var ok = (OkObjectResult)await _controller.ListarGuiches();
        var guiches = (IEnumerable<Guiche>)ok.Value!;

        guiches.Should().OnlyContain(g => g.Ativo);
    }
}