using backend.Models;
using FluentAssertions;
using Xunit;

namespace backend.Tests.Models;

/// <summary>
/// Testes unitários dos modelos de domínio.
/// Verificam valores padrão, constraints e comportamento sem banco.
/// </summary>
public class ModelTests
{
    // ─── Usuario ─────────────────────────────────────────────────────────────

    [Fact]
    public void Usuario_RolePadrao_EhCliente()
    {
        var usuario = new Usuario();
        usuario.Role.Should().Be("Cliente");
    }

    [Fact]
    public void Usuario_DataCriacao_EhDefinidaAutomaticamente()
    {
        var antes = DateTime.UtcNow;
        var usuario = new Usuario();
        var depois = DateTime.UtcNow;

        usuario.DataCriacao.Should().BeOnOrAfter(antes).And.BeOnOrBefore(depois);
    }

    [Fact]
    public void Usuario_PropriedadesDeString_InicializamComoVazio()
    {
        var usuario = new Usuario();
        usuario.Nome.Should().Be(string.Empty);
        usuario.Email.Should().Be(string.Empty);
        usuario.SenhaHash.Should().Be(string.Empty);
    }

    // ─── Fila ────────────────────────────────────────────────────────────────

    [Fact]
    public void Fila_AtivaPadrao_EhTrue()
    {
        var fila = new Fila();
        fila.Ativa.Should().BeTrue();
    }

    [Fact]
    public void Fila_EhPublicaPadrao_EhTrue()
    {
        var fila = new Fila();
        fila.EhPublica.Should().BeTrue();
    }

    [Fact]
    public void Fila_CodigoAcessoPadrao_EhVazio()
    {
        var fila = new Fila();
        fila.CodigoAcesso.Should().Be(string.Empty);
    }

    [Fact]
    public void Fila_LatitudeLongitude_SaoNullableEInicialmenteNulas()
    {
        var fila = new Fila();
        fila.Latitude.Should().BeNull();
        fila.Longitude.Should().BeNull();
    }

    [Fact]
    public void Fila_DataCriacao_EhDefinidaAutomaticamente()
    {
        var antes = DateTime.UtcNow;
        var fila = new Fila();
        var depois = DateTime.UtcNow;

        fila.DataCriacao.Should().BeOnOrAfter(antes).And.BeOnOrBefore(depois);
    }

    [Fact]
    public void Fila_NomeVazio_InicializaComoStringVazia()
    {
        var fila = new Fila();
        fila.Nome.Should().Be(string.Empty);
        fila.TipoServico.Should().Be(string.Empty);
    }

    // ─── Atendimento ─────────────────────────────────────────────────────────

    [Fact]
    public void Atendimento_StatusPadrao_EhAguardando()
    {
        var atendimento = new Atendimento();
        atendimento.Status.Should().Be("Aguardando");
    }

    [Fact]
    public void Atendimento_SenhaPadrao_EhStringVazia()
    {
        var atendimento = new Atendimento();
        atendimento.Senha.Should().Be(string.Empty);
    }

    [Fact]
    public void Atendimento_GuicheId_EhNullavel()
    {
        var atendimento = new Atendimento();
        atendimento.GuicheId.Should().BeNull();
    }

    [Fact]
    public void Atendimento_DataHoraAtendimento_EhNullavel()
    {
        var atendimento = new Atendimento();
        atendimento.DataHoraAtendimento.Should().BeNull();
    }

    [Fact]
    public void Atendimento_DataHoraEntrada_EhDefinidaAutomaticamente()
    {
        var antes = DateTime.UtcNow.AddSeconds(-1);
        var atendimento = new Atendimento();
        var depois = DateTime.UtcNow.AddSeconds(1);

        atendimento.DataHoraEntrada.Should().BeOnOrAfter(antes).And.BeOnOrBefore(depois);
    }

    // ─── Guiche ──────────────────────────────────────────────────────────────

    [Fact]
    public void Guiche_AtivoPadrao_EhTrue()
    {
        var guiche = new Guiche();
        guiche.Ativo.Should().BeTrue();
    }

    [Fact]
    public void Guiche_NumeroOuNomePadrao_EhStringVazia()
    {
        var guiche = new Guiche();
        guiche.NumeroOuNome.Should().Be(string.Empty);
    }

    [Fact]
    public void Guiche_FilaAtendimento_EhNullavel()
    {
        var guiche = new Guiche();
        guiche.FilaAtendimento.Should().BeNull();
        guiche.FilaIdAtendimento.Should().BeNull();
    }

    // ─── Consistência entre modelos ──────────────────────────────────────────

    [Fact]
    public void Atendimento_PodeReferenciarFilaEUsuario()
    {
        var fila = new Fila { Id = 1, Nome = "Triagem", TipoServico = "Geral", TempoMedioAtendimento = 5 };
        var usuario = new Usuario { Id = 1, Nome = "João", Email = "joao@test.com", SenhaHash = "hash" };

        var atendimento = new Atendimento
        {
            FilaId = fila.Id,
            Fila = fila,
            UsuarioId = usuario.Id,
            Usuario = usuario,
            Senha = "TRI-001",
            Posicao = 1
        };

        atendimento.Fila.Nome.Should().Be("Triagem");
        atendimento.Usuario.Nome.Should().Be("João");
        atendimento.Posicao.Should().Be(1);
    }

    [Fact]
    public void Atendimento_PodeReferenciarGuiche()
    {
        var guiche = new Guiche { Id = 1, NumeroOuNome = "Guichê 01" };
        var atendimento = new Atendimento
        {
            GuicheId = guiche.Id,
            Guiche = guiche
        };

        atendimento.Guiche!.NumeroOuNome.Should().Be("Guichê 01");
    }
}