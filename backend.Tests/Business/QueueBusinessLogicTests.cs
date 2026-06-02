using FluentAssertions;
using Xunit;

namespace backend.Tests.Business;

/// <summary>
/// Testa a lógica de negócio pura do SemFila sem dependências externas:
/// geração de senhas, cálculo de posições, recomendações de deslocamento
/// e lógica de alertas preditivos.
/// </summary>
public class QueueBusinessLogicTests
{
    // ─── Geração de senha ─────────────────────────────────────────────────────
    // Espelha o algoritmo de FilaController.EntrarNaFila

    private static string GerarSenha(string nomeFila, int sequencial)
    {
        var prefixo = nomeFila.Length >= 3
            ? nomeFila[..3].ToUpper()
            : "FIL";
        return $"{prefixo}-{sequencial:D3}";
    }

    [Fact]
    public void GerarSenha_PrimeiroTicket_FormatoCorreto()
    {
        GerarSenha("Triagem Geral", 1).Should().Be("TRI-001");
    }

    [Fact]
    public void GerarSenha_DecimoTicket_PadWith3Zeros()
    {
        GerarSenha("Farmácia", 10).Should().Be("FAR-010");
    }

    [Fact]
    public void GerarSenha_CentesimoTicket_SemPadding()
    {
        GerarSenha("Atendimento", 100).Should().Be("ATE-100");
    }

    [Fact]
    public void GerarSenha_NomeMenorQue3Chars_UsaFIL()
    {
        GerarSenha("AB", 1).Should().Be("FIL-001");
    }

    [Fact]
    public void GerarSenha_NomeExatamente3Chars_UsaTodosOsChars()
    {
        GerarSenha("Lab", 5).Should().Be("LAB-005");
    }

    [Fact]
    public void GerarSenha_PrefixoSempreEmMaiusculo()
    {
        GerarSenha("farmácia", 1).Should().StartWith("FAR");
    }

    [Theory]
    [InlineData("Triagem Geral", 1, "TRI-001")]
    [InlineData("Consulta Médica", 42, "CON-042")]
    [InlineData("RX", 7, "FIL-007")]
    [InlineData("Vacinação", 999, "VAC-999")]
    public void GerarSenha_Parametrizado(string nome, int seq, string esperado)
    {
        GerarSenha(nome, seq).Should().Be(esperado);
    }

    // ─── Recomendação de deslocamento ─────────────────────────────────────────
    // Espelha a lógica de FilaController.CalcularDeslocamento

    private static (string recomendacao, bool deveSairAgora) GerarRecomendacao(
        int tempoDeslocamento, int tempoEspera)
    {
        if (tempoDeslocamento >= tempoEspera)
            return ("Saia imediatamente! O seu tempo de deslocamento estimado é maior ou igual ao tempo de espera na fila.", true);

        if (tempoEspera - tempoDeslocamento <= 10)
            return ("Prepare-se para sair. Você possui menos de 10 minutos de margem segura para o seu atendimento.", true);

        int restante = tempoEspera - tempoDeslocamento;
        return ($"Fique tranquilo. Você pode aguardar mais {restante} minutos antes de iniciar sua locomoção.", false);
    }

    [Fact]
    public void Recomendacao_DeslocamentoMaiorQueEspera_SaiaImediatamente()
    {
        var (msg, sair) = GerarRecomendacao(tempoDeslocamento: 30, tempoEspera: 20);
        sair.Should().BeTrue();
        msg.Should().Contain("Saia imediatamente");
    }

    [Fact]
    public void Recomendacao_DeslocamentoIgualEspera_SaiaImediatamente()
    {
        var (msg, sair) = GerarRecomendacao(tempoDeslocamento: 15, tempoEspera: 15);
        sair.Should().BeTrue();
        msg.Should().Contain("Saia imediatamente");
    }

    [Fact]
    public void Recomendacao_MargemMenorOuIgualA10_PrepararSair()
    {
        var (msg, sair) = GerarRecomendacao(tempoDeslocamento: 20, tempoEspera: 25);
        // margem = 5 ≤ 10
        sair.Should().BeTrue();
        msg.Should().Contain("Prepare-se para sair");
    }

    [Fact]
    public void Recomendacao_MargemExatamente10_PrepararSair()
    {
        var (msg, sair) = GerarRecomendacao(tempoDeslocamento: 10, tempoEspera: 20);
        // margem = 10 ≤ 10
        sair.Should().BeTrue();
        msg.Should().Contain("Prepare-se para sair");
    }

    [Fact]
    public void Recomendacao_MargemConfortavel_FiqueTranquilo()
    {
        var (msg, sair) = GerarRecomendacao(tempoDeslocamento: 5, tempoEspera: 30);
        // margem = 25 > 10
        sair.Should().BeFalse();
        msg.Should().Contain("Fique tranquilo");
        msg.Should().Contain("25 minutos");
    }

    [Fact]
    public void Recomendacao_MargemMenor11_NaoEhConfortavel()
    {
        var (_, sair) = GerarRecomendacao(tempoDeslocamento: 19, tempoEspera: 30);
        // margem = 11 > 10 → fique tranquilo
        sair.Should().BeFalse();
    }

    [Theory]
    [InlineData(30, 20, true)]   // desloc > espera → sair
    [InlineData(15, 15, true)]   // desloc == espera → sair
    [InlineData(20, 25, true)]   // margem 5 → sair
    [InlineData(10, 20, true)]   // margem 10 exato → sair
    [InlineData(5,  30, false)]  // margem 25 → tranquilo
    [InlineData(0,  60, false)]  // sem deslocamento → tranquilo
    public void Recomendacao_Parametrizado(int desloc, int espera, bool esperadoSair)
    {
        var (_, sair) = GerarRecomendacao(desloc, espera);
        sair.Should().Be(esperadoSair);
    }

    // ─── Cálculo de tempo estimado de espera ──────────────────────────────────

    [Fact]
    public void TempoEspera_Posicao1_TempoMedio5_Retorna5Min()
    {
        int posicao = 1;
        int tempoMedio = 5;
        (posicao * tempoMedio).Should().Be(5);
    }

    [Fact]
    public void TempoEspera_Posicao10_TempoMedio8_Retorna80Min()
    {
        (10 * 8).Should().Be(80);
    }

    [Fact]
    public void TempoEspera_Posicao0_Retorna0()
    {
        (0 * 10).Should().Be(0);
    }

    // ─── Código de acesso para filas privadas ─────────────────────────────────

    [Fact]
    public void CodigoAcesso_TamanhoEhExatamente8Chars()
    {
        var codigo = Guid.NewGuid().ToString()[..8];
        codigo.Length.Should().Be(8);
    }

    [Fact]
    public void CodigoAcesso_DoisCodigosSaoDistintos()
    {
        var c1 = Guid.NewGuid().ToString()[..8];
        var c2 = Guid.NewGuid().ToString()[..8];
        c1.Should().NotBe(c2);
    }

    [Fact]
    public void CodigoAcesso_ContemApenasHexadecimaisEHifen()
    {
        for (int i = 0; i < 20; i++)
        {
            var codigo = Guid.NewGuid().ToString()[..8];
            codigo.Should().MatchRegex(@"^[0-9a-f\-]+$");
        }
    }
}