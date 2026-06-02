using FluentAssertions;
using Xunit;

namespace backend.Tests.Services;

/// <summary>
/// Testa a matemática do fallback Haversine (distância geodésica) de forma isolada.
/// A fórmula é replicada aqui para garantir que o algoritmo produz resultados
/// dentro das margens aceitáveis para casos de uso reais do SemFila.
/// </summary>
public class HaversineCalculationTests
{
    // ─── Implementação da fórmula (espelho do FilaController) ────────────────

    private static double ToRadians(double val) => Math.PI / 180 * val;

    private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371;
        double dLat = ToRadians(lat2 - lat1);
        double dLon = ToRadians(lon2 - lon1);
        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                 + Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2))
                 * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static int HaversineMinutes(double distanciaKm)
        => (int)Math.Ceiling(distanciaKm * 2);

    // ─── Testes ───────────────────────────────────────────────────────────────

    [Fact]
    public void Haversine_MesmoPonto_RetornaZero()
    {
        var distancia = HaversineKm(-8.05, -34.88, -8.05, -34.88);
        distancia.Should().BeApproximately(0, 0.001);
    }

    [Fact]
    public void Haversine_RecifeParaJoaoPessoa_AproximadamenteCorreta()
    {
        // Distância real em linha reta ≈ 115 km
        var distancia = HaversineKm(-8.0476, -34.8770, -7.1195, -34.8450);
        distancia.Should().BeInRange(100, 130);
    }

    [Fact]
    public void Haversine_RecifeParaFortaleza_AproximadamenteCorreta()
    {
        // ≈ 630 km em linha reta
        var distancia = HaversineKm(-8.0476, -34.8770, -3.7172, -38.5433);
        distancia.Should().BeInRange(590, 670);
    }

    [Fact]
    public void Haversine_EhSimetrico_ABIgualBA()
    {
        var ab = HaversineKm(-8.05, -34.88, -8.10, -34.92);
        var ba = HaversineKm(-8.10, -34.92, -8.05, -34.88);
        ab.Should().BeApproximately(ba, 0.001);
    }

    [Fact]
    public void Haversine_PontosProximos_MenosDe5Km()
    {
        // Dois pontos a ~1 km de distância em Recife
        var distancia = HaversineKm(-8.0542, -34.8813, -8.0600, -34.8820);
        distancia.Should().BeLessThan(5);
    }

    [Fact]
    public void HaversineMinutos_1Km_Retorna2Minutos()
    {
        // 1 km * 2 = 2 min (velocidade média simplificada do sistema)
        HaversineMinutes(1.0).Should().Be(2);
    }

    [Fact]
    public void HaversineMinutos_ArredondaParaCima()
    {
        // 1.1 km → 2.2 → Math.Ceiling → 3 min
        HaversineMinutes(1.1).Should().Be(3);
    }

    [Fact]
    public void HaversineMinutos_ValorExato_NaoArredonda()
    {
        // 5 km → 10 min exato
        HaversineMinutes(5.0).Should().Be(10);
    }

    [Theory]
    [InlineData(0.5, 1)]   // 0.5 km * 2 = 1.0 → 1 min
    [InlineData(1.5, 3)]   // 1.5 km * 2 = 3.0 → 3 min
    [InlineData(2.1, 5)]   // 2.1 km * 2 = 4.2 → ceil → 5 min
    [InlineData(10.0, 20)] // 10 km * 2 = 20 → 20 min
    public void HaversineMinutos_Parametrizado(double km, int esperado)
    {
        HaversineMinutes(km).Should().Be(esperado);
    }

    [Fact]
    public void Haversine_DistanciaPositiva_Sempre()
    {
        var pares = new[]
        {
            (-8.05, -34.88, -9.10, -35.20),
            (0.0, 0.0, 1.0, 1.0),
            (51.5, -0.12, 48.85, 2.35)   // Londres → Paris
        };

        foreach (var (lat1, lon1, lat2, lon2) in pares)
        {
            HaversineKm(lat1, lon1, lat2, lon2).Should().BeGreaterThan(0);
        }
    }
}