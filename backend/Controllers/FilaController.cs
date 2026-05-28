using backend.Data;
using backend.DTOs;
using backend.Hubs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FilaController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly IHubContext<FilaHub> _hubContext;
        private readonly GoogleMapsService _googleMapsService;

        public FilaController(DataContext context, IHubContext<FilaHub> hubContext, GoogleMapsService googleMapsService)
        {
            _context = context;
            _hubContext = hubContext;
            _googleMapsService = googleMapsService;
        }

        // 1. Endpoint para criar uma nova fila
        [HttpPost]
        public async Task<IActionResult> CriarFila([FromBody] CriarFilaDto request)
        {
            var novaFila = new Fila
            {
                Nome = request.Nome,
                TipoServico = request.TipoServico,
                TempoMedioAtendimento = request.TempoMedioAtendimento,
                Latitude = request.Latitude,   
                Longitude = request.Longitude, 
                Ativa = true 
            };

            _context.Filas.Add(novaFila);
            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("FilaCriada");

            return Ok(new { message = "Fila de atendimento criada com sucesso!", fila = novaFila });
        }

        // 2. Endpoint para listar todas as filas
        [HttpGet]
        public async Task<IActionResult> ListarFilas()
        {
            var filas = await _context.Filas.ToListAsync();
            return Ok(filas);
        }

        [HttpPost("entrar")]
        [Authorize]
        public async Task<IActionResult> EntrarNaFila([FromBody] EntrarFilaDto request)
        {
            // 1. Validar se a fila existe e está ativa
            var fila = await _context.Filas.FindAsync(request.FilaId);
            if (fila == null || !fila.Ativa)
            {
                return BadRequest(new { message = "Esta fila não está disponível para atendimento." });
            }

            // 2. Extrair o ID do Usuário do Token JWT autenticado
            var usuarioIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(usuarioIdClaim))
            {
                return Unauthorized(new { message = "Usuário não identificado no token." });
            }
            int usuarioId = int.Parse(usuarioIdClaim);

            // 3. Verificar se o usuário já está aguardando nesta mesma fila (evita duplicidade)
            var jaEstaNaFila = await _context.Atendimentos
                .AnyAsync(a => a.FilaId == request.FilaId && a.UsuarioId == usuarioId && a.Status == "Aguardando");
                
            if (jaEstaNaFila)
            {
                return BadRequest(new { message = "Você já possui uma senha ativa nesta fila." });
            }

            // 4. Calcular o número da próxima senha para esta fila específica
            int totalAtendimentosFila = await _context.Atendimentos
                .CountAsync(a => a.FilaId == request.FilaId);
            
            int proximoNumero = totalAtendimentosFila + 1;
            string prefixo = fila.Nome.Length >= 3 ? fila.Nome.Substring(0, 3).ToUpper() : "FIL";
            string senhaGerada = $"{prefixo}-{proximoNumero:D3}";

            // 5. Calcular a posição atual do usuário (quantas pessoas estão com status "Aguardando")
            int pessoasNaFrente = await _context.Atendimentos
                .CountAsync(a => a.FilaId == request.FilaId && a.Status == "Aguardando");
            
            int posicaoAtual = pessoasNaFrente + 1;

            // 6. Criar e salvar o registro do Atendimento
            var novoAtendimento = new Atendimento
            {
                FilaId = request.FilaId,
                UsuarioId = usuarioId,
                Senha = senhaGerada,
                Posicao = posicaoAtual,
                Status = "Aguardando"
            };

            _context.Atendimentos.Add(novoAtendimento);
            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("AtualizarFila", request.FilaId);

            return Ok(new
            {
                message = "Você entrou na fila com sucesso!",
                atendimento = new
                {
                    novoAtendimento.Id,
                    FilaNome = fila.Nome,
                    novoAtendimento.Senha,
                    novoAtendimento.Posicao,
                    novoAtendimento.Status,
                    novoAtendimento.DataHoraEntrada
                }
            });
        }
    
        [HttpGet("meus-atendimentos")]
        [Authorize]
        public async Task<IActionResult> ObterMeusAtendimentos()
        {
            var usuarioIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(usuarioIdClaim))
            {
                return Unauthorized(new { message = "Usuário não identificado no token." });
            }
            int usuarioId = int.Parse(usuarioIdClaim);

            var atendimentosAtivos = await _context.Atendimentos
                .Include(a => a.Fila)
                .Where(a => a.UsuarioId == usuarioId && (a.Status == "Aguardando" || a.Status == "Chamado"))
                .OrderByDescending(a => a.DataHoraEntrada)
                .Select(a => new
                {
                    a.Id,
                    a.Senha,
                    a.Posicao,
                    a.Status,
                    a.DataHoraEntrada,
                    Fila = new
                    {
                        a.Fila!.Id,
                        a.Fila.Nome,
                        a.Fila.TipoServico,
                        TempoEstimadoEsperaMinutos = a.Posicao * a.Fila.TempoMedioAtendimento
                    }
                })
                .ToListAsync();

            return Ok(atendimentosAtivos);
        }

        [HttpPost("chamar-proxima")]
        // [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ChamarProximaSenha([FromBody] EntrarFilaDto request)
        {
            var proximoAtendimento = await _context.Atendimentos
                .Where(a => a.FilaId == request.FilaId && a.Status == "Aguardando")
                .OrderBy(a => a.DataHoraEntrada)
                .FirstOrDefaultAsync();

            if (proximoAtendimento == null)
            {
                return NotFound(new { message = "Não há nenhuma senha aguardando nesta fila." });
            }

            proximoAtendimento.Status = "Chamado";
            proximoAtendimento.DataHoraAtendimento = DateTime.UtcNow;

            var restantes = await _context.Atendimentos
                .Where(a => a.FilaId == request.FilaId && a.Status == "Aguardando")
                .ToListAsync();

            foreach (var atendimento in restantes)
            {
                if (atendimento.Posicao > 0)
                {
                    atendimento.Posicao -= 1;
                }
            }

            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("SenhaChamada", new { 
                senha = proximoAtendimento.Senha, 
                filaId = request.FilaId 
            });
            
            await _hubContext.Clients.All.SendAsync("AtualizarFila", request.FilaId);

            return Ok(new { message = $"Senha {proximoAtendimento.Senha} chamada com sucesso!", atendimento = proximoAtendimento });
        }

        // 3. Endpoint de Cálculo Preditivo de Locomoção (Híbrido: Google Maps Matrix + Fallback Haversine)
        [HttpPost("calcular-deslocamento")]
        [Authorize]
        public async Task<IActionResult> CalcularDeslocamento([FromBody] CalcularDeslocamentoDto request)
        {
            var atendimento = await _context.Atendimentos
                .Include(a => a.Fila)
                .FirstOrDefaultAsync(a => a.Id == request.AtendimentoId && a.Status == "Aguardando");

            if (atendimento == null || atendimento.Fila == null)
            {
                return NotFound(new { message = "Atendimento ativo não encontrado." });
            }

            var fila = atendimento.Fila;

            if (!fila.Latitude.HasValue || !fila.Longitude.HasValue)
            {
                return BadRequest(new { message = "Este estabelecimento não possui coordenadas configuradas." });
            }

            int tempoDeslocamentoMinutos;
            double distanciaKm;

            // Tentativa de obter rota exata e trânsito real do Google Maps
            var dadosGoogle = await _googleMapsService.CalcularTempoEDistancia(
                request.LatitudeCliente, request.LongitudeCliente, 
                fila.Latitude.Value, fila.Longitude.Value
            );

            if (dadosGoogle.tempoMinutos.HasValue && dadosGoogle.distanciaKm.HasValue)
            {
                tempoDeslocamentoMinutos = dadosGoogle.tempoMinutos.Value;
                distanciaKm = dadosGoogle.distanciaKm.Value;
            }
            else
            {
                // FALLBACK: Fórmula Matemática de Haversine (Linha reta) caso falte chave ou acabe a cota
                double R = 6371; 
                double dLat = ToRadians(fila.Latitude.Value - request.LatitudeCliente);
                double dLon = ToRadians(fila.Longitude.Value - request.LongitudeCliente);

                double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                           Math.Cos(ToRadians(request.LatitudeCliente)) * Math.Cos(ToRadians(fila.Latitude.Value)) *
                           Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
                           
                double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
                distanciaKm = R * c; 

                // Estimativa assumindo velocidade média urbana de 30 km/h
                tempoDeslocamentoMinutos = (int)Math.Ceiling(distanciaKm * 2); 
            }

            int tempoEsperaFilaMinutos = atendimento.Posicao * fila.TempoMedioAtendimento;

            string recomendacao;
            bool deveSairAgora = false;

            if (tempoDeslocamentoMinutos >= tempoEsperaFilaMinutos)
            {
                recomendacao = "Saia imediatamente! O seu tempo de deslocamento estimado é maior ou igual ao tempo de espera na fila.";
                deveSairAgora = true;
            }
            else if (tempoEsperaFilaMinutos - tempoDeslocamentoMinutos <= 10)
            {
                recomendacao = "Prepare-se para sair. Você possui menos de 10 minutos de margem segura para o seu atendimento.";
                deveSairAgora = true;
            }
            else
            {
                int minutosRestantesParaSair = tempoEsperaFilaMinutos - tempoDeslocamentoMinutos;
                recomendacao = $"Fique tranquilo. Você pode aguardar mais {minutosRestantesParaSair} minutos antes de iniciar sua locomoção.";
            }

            return Ok(new
            {
                distanciaKm = Math.Round(distanciaKm, 2),
                tempoDeslocamentoMinutos,
                tempoEsperaFilaMinutos,
                recomendacao,
                deveSairAgora
            });
        }

        private double ToRadians(double val)
        {
            return (Math.PI / 180) * val;
        }
    }
}