using System.Text.Json;

namespace backend.Services
{
    public class GoogleMapsService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public GoogleMapsService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["GoogleMaps:ApiKey"]!;
        }

        public async Task<(int? tempoMinutos, double? distanciaKm)> CalcularTempoEDistancia(double originLat, double originLng, double destLat, double destLng)
        {
            // Se você ainda não tiver a chave, o sistema não quebra e podemos simular ou usar o Haversine
            if (string.IsNullOrEmpty(_apiKey) || _apiKey.StartsWith("AIzaSyBdJxJkF27X9lxXcI9ZXVrxQdWZnfAxpkk"))
            {
                return (null, null); 
            }

            try
            {
                var url = $"https://maps.googleapis.com/maps/api/distancematrix/json?origins={originLat},{originLng}&destinations={destLat},{destLng}&mode=driving&key={_apiKey}";
                
                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode) return (null, null);

                var jsonString = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonString);
                var root = doc.RootElement;

                // Navega no JSON de retorno do Google Maps
                var status = root.GetProperty("rows")[0].GetProperty("elements")[0].GetProperty("status").GetString();
                
                if (status == "OK")
                {
                    // Distância em metros -> converter para KM
                    double distanciaMetros = root.GetProperty("rows")[0].GetProperty("elements")[0].GetProperty("distance").GetProperty("value").GetDouble();
                    double distanciaKm = distanciaMetros / 1000.0;

                    // Tempo em segundos -> converter para minutos
                    double segundos = root.GetProperty("rows")[0].GetProperty("elements")[0].GetProperty("duration").GetProperty("value").GetDouble();
                    int tempoMinutos = (int)Math.Ceiling(segundos / 60.0);

                    return (tempoMinutos, distanciaKm);
                }
            }
            catch
            {
                // Em caso de falha na API do Google, retorna nulo para usarmos o Haversine como plano B (fallback)
            }

            return (null, null);
        }
    }
}