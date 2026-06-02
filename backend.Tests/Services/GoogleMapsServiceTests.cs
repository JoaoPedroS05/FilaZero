using backend.Services;
using backend.Tests.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;
using Moq.Protected;
using System.Net;
using Xunit;

namespace backend.Tests.Services;

/// <summary>
/// Testes do GoogleMapsService.
/// Usa um HttpClient mockado para simular respostas da API do Google
/// e cobre o caminho de fallback Haversine quando a chave está ausente.
/// </summary>
public class GoogleMapsServiceTests
{
    // ─── Helpers ─────────────────────────────────────────────────────────────

    private static IConfiguration BuildConfigWithKey(string apiKey) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["GoogleMaps:ApiKey"] = apiKey
            })
            .Build();

    private static GoogleMapsService BuildServiceWithResponse(string jsonBody, string apiKey = "AIzaSyValidKey123")
    {
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(jsonBody)
            });

        var httpClient = new HttpClient(handlerMock.Object);
        var config = BuildConfigWithKey(apiKey);
        return new GoogleMapsService(httpClient, config);
    }

    // ─── Chave ausente / placeholder ─────────────────────────────────────────

    [Fact]
    public async Task CalcularTempoEDistancia_SemChaveApi_RetornaNulos()
    {
        var config = BuildConfigWithKey("");
        var service = new GoogleMapsService(new HttpClient(), config);

        var (tempo, distancia) = await service.CalcularTempoEDistancia(
            -8.05, -34.88, -8.06, -34.89);

        tempo.Should().BeNull();
        distancia.Should().BeNull();
    }

    [Fact]
    public async Task CalcularTempoEDistancia_ChavePlaceholderAIza_RetornaNulos()
    {
        // O service trata chaves começando com "AIzaSyBdJ..." como mockadas
        var config = BuildConfigWithKey("AIzaSyBdJxJkF27X9lxXcI9ZXVrxQdWZnfAxpkk");
        var service = new GoogleMapsService(new HttpClient(), config);

        var (tempo, distancia) = await service.CalcularTempoEDistancia(
            -8.05, -34.88, -8.06, -34.89);

        tempo.Should().BeNull();
        distancia.Should().BeNull();
    }

    // ─── Resposta OK da API do Google ─────────────────────────────────────────

    [Fact]
    public async Task CalcularTempoEDistancia_RespostaOkDoGoogle_RetornaValoresCorretos()
    {
        // 1800 segundos = 30 min; 15000 metros = 15 km
        var json = """
        {
          "rows": [{
            "elements": [{
              "status": "OK",
              "duration": { "value": 1800 },
              "distance": { "value": 15000 }
            }]
          }]
        }
        """;

        var service = BuildServiceWithResponse(json);
        var (tempo, distancia) = await service.CalcularTempoEDistancia(
            -8.05, -34.88, -8.10, -34.90);

        tempo.Should().Be(30);
        distancia.Should().BeApproximately(15.0, 0.01);
    }

    [Fact]
    public async Task CalcularTempoEDistancia_TempoNaoInteiroArredondaParaCima()
    {
        // 91 segundos → Math.Ceiling(91/60) = 2 minutos
        var json = """
        {
          "rows": [{
            "elements": [{
              "status": "OK",
              "duration": { "value": 91 },
              "distance": { "value": 1000 }
            }]
          }]
        }
        """;

        var service = BuildServiceWithResponse(json);
        var (tempo, _) = await service.CalcularTempoEDistancia(0, 0, 0, 0);
        tempo.Should().Be(2);
    }

    // ─── Resposta NOT_FOUND / ZERO_RESULTS da API ─────────────────────────────

    [Fact]
    public async Task CalcularTempoEDistancia_StatusNaoOk_RetornaNulos()
    {
        var json = """
        {
          "rows": [{
            "elements": [{
              "status": "NOT_FOUND"
            }]
          }]
        }
        """;

        var service = BuildServiceWithResponse(json);
        var (tempo, distancia) = await service.CalcularTempoEDistancia(0, 0, 0, 0);

        tempo.Should().BeNull();
        distancia.Should().BeNull();
    }

    // ─── Falha de rede ────────────────────────────────────────────────────────

    [Fact]
    public async Task CalcularTempoEDistancia_ExcecaoDeRede_RetornaNulos()
    {
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("timeout"));

        var config = BuildConfigWithKey("AIzaSyValidKey123");
        var service = new GoogleMapsService(new HttpClient(handlerMock.Object), config);

        var (tempo, distancia) = await service.CalcularTempoEDistancia(0, 0, 0, 0);

        tempo.Should().BeNull();
        distancia.Should().BeNull();
    }

    [Fact]
    public async Task CalcularTempoEDistancia_RespostaHttp500_RetornaNulos()
    {
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.InternalServerError
            });

        var config = BuildConfigWithKey("AIzaSyValidKey123");
        var service = new GoogleMapsService(new HttpClient(handlerMock.Object), config);

        var (tempo, distancia) = await service.CalcularTempoEDistancia(0, 0, 0, 0);

        tempo.Should().BeNull();
        distancia.Should().BeNull();
    }
}