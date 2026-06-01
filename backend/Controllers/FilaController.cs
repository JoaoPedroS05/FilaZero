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
    // Criando o DTO seguro para evitar quebras de tipos primitivos no JSON
    public class FinalizarTicketDto
    {
        public int AtendimentoId { get; set; }
    }

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

        // Endpoint para criar uma nova fila
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CriarFila([FromBody] CriarFilaDto request)
        {
            var novaFila = new Fila
            {
                Nome = request.Nome,
                TipoServico = request.TipoServico,
                TempoMedioAtendimento = request.TempoMedioAtendimento,
                Latitude = request.Latitude,   
                Longitude = request.Longitude, 
                Ativa = true,
                EhPublica = request.EhPublica, 
                CodigoAcesso = !request.EhPublica ? Guid.NewGuid().ToString().Substring(0, 8) : string.Empty
            };

            _context.Filas.Add(novaFila);
            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("FilaCriada");

            return Ok(new { message = "Fila de atendimento criada com sucesso!", fila = novaFila });
        }

        // Endpoint para o Admin desativar/remover uma fila
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RemoverFila(int id)
        {
            var fila = await _context.Filas.FindAsync(id);
            if (fila == null)
            {
                return NotFound(new { message = "Fila não encontrada." });
            }

            fila.Ativa = false;

            var atendimentosAtivos = await _context.Atendimentos
                .Where(a => a.FilaId == id && a.Status == "Aguardando")
                .ToListAsync();

            foreach (var atendimento in atendimentosAtivos)
            {
                atendimento.Status = "Cancelado";
                atendimento.Posicao = 0;
            }

            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("FilaCriada"); 
            await _hubContext.Clients.All.SendAsync("AtualizarFila", id);

            return Ok(new { message = $"Fila '{fila.Nome}' e seus atendimentos ativos foram encerrados com sucesso." });
        }

        // Endpoint para o Cliente desistir/sair da fila
        [HttpPost("sair")]
        [Authorize]
        public async Task<IActionResult> SairDaFila([FromBody] EntrarFilaDto request)
        {
            var usuarioIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(usuarioIdClaim))
            {
                return Unauthorized(new { message = "Usuário não identificado." });
            }
            int usuarioId = int.Parse(usuarioIdClaim);

            var atendimentoUsuario = await _context.Atendimentos
                .FirstOrDefaultAsync(a => a.FilaId == request.FilaId && a.UsuarioId == usuarioId && a.Status == "Aguardando");

            if (atendimentoUsuario == null)
            {
                return NotFound(new { message = "Você não possui um ticket ativo aguardando nesta fila." });
            }

            int posicaoRemovida = atendimentoUsuario.Posicao;

            atendimentoUsuario.Status = "Cancelado";
            atendimentoUsuario.Posicao = 0;

            var pessoasAtras = await _context.Atendimentos
                .Where(a => a.FilaId == request.FilaId && a.Status == "Aguardando" && a.Posicao > posicaoRemovida)
                .ToListAsync();

            foreach (var atendimento in pessoasAtras)
            {
                atendimento.Posicao -= 1;
            }

            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("AtualizarFila", request.FilaId);

            return Ok(new { message = "Você saiu da fila com sucesso." });
        }
       
        // Endpoint para listar apenas as filas ativas que são públicas
        [HttpGet]
        public async Task<IActionResult> ListarFilas()
        {
            var filas = await _context.Filas.Where(f => f.Ativa).ToListAsync();
            return Ok(filas);
        }

        [HttpGet("publicas")]
        public async Task<IActionResult> ListarFilasPublicas()
        {
            var filasPublicas = await _context.Filas
                .Where(f => f.Ativa && f.EhPublica)
                .ToListAsync();
            return Ok(filasPublicas);
        }

        [HttpPost("entrar")]
        [Authorize]
        public async Task<IActionResult> EntrarNaFila([FromBody] EntrarFilaDto request)
        {
            var fila = await _context.Filas.FindAsync(request.FilaId);
            if (fila == null || !fila.Ativa)
            {
                return BadRequest(new { message = "Esta fila não está disponível para atendimento." });
            }

            var usuarioIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(usuarioIdClaim))
            {
                return Unauthorized(new { message = "Usuário não identificado no token." });
            }
            int usuarioId = int.Parse(usuarioIdClaim);

            var jaEstaNaFila = await _context.Atendimentos
                .AnyAsync(a => a.FilaId == request.FilaId && a.UsuarioId == usuarioId && a.Status == "Aguardando");
                
            if (jaEstaNaFila)
            {
                return BadRequest(new { message = "Você já possui uma senha ativa nesta fila." });
            }

            int totalAtendimentosFila = await _context.Atendimentos.CountAsync(a => a.FilaId == request.FilaId);
            
            int proximoNumero = totalAtendimentosFila + 1;
            string prefixo = fila.Nome.Length >= 3 ? fila.Nome.Substring(0, 3).ToUpper() : "FIL";
            string senhaGerada = $"{prefixo}-{proximoNumero:D3}";

            int pessoasNaFrente = await _context.Atendimentos
                .CountAsync(a => a.FilaId == request.FilaId && a.Status == "Aguardando");
            
            int posicaoAtual = pessoasNaFrente + 1;

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
                        a.Fila.EhPublica,
                        a.Fila.Latitude,
                        a.Fila.Longitude,
                        TempoEstimadoEsperaMinutos = a.Posicao * a.Fila.TempoMedioAtendimento
                    }
                })
                .ToListAsync();

            return Ok(atendimentosAtivos);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("chamar-proxima")]
        public async Task<IActionResult> ChamarProximaSenha([FromBody] ChamarSenhaDto request)
        {
            var proximoAtendimento = await _context.Atendimentos
                .Where(a => a.FilaId == request.FilaId && a.Status == "Aguardando")
                .OrderBy(a => a.DataHoraEntrada)
                .FirstOrDefaultAsync();

            if (proximoAtendimento == null)
            {
                return NotFound(new { message = "Não há nenhuma senha aguardando nesta fila." });
            }

            var guiche = await _context.Guiches.FindAsync(request.GuicheId);
            if (guiche == null || !guiche.Ativo)
            {
                return BadRequest(new { message = "O guichê selecionado não está ativo ou não existe." });
            }

            proximoAtendimento.Status = "Chamado";
            proximoAtendimento.GuicheId = request.GuicheId;
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
                filaId = request.FilaId,
                guicheNome = guiche.NumeroOuNome 
            });
            
            await _hubContext.Clients.All.SendAsync("AtualizarFila", request.FilaId);

            return Ok(new { message = $"Senha {proximoAtendimento.Senha} chamada no {guiche.NumeroOuNome}!", atendimento = proximoAtendimento });
        }

        // Endpoint de Cálculo Preditivo de Locomoção
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
                double R = 6371; 
                double dLat = ToRadians(fila.Latitude.Value - request.LatitudeCliente);
                double dLon = ToRadians(fila.Longitude.Value - request.LongitudeCliente);

                double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                           Math.Cos(ToRadians(request.LatitudeCliente)) * Math.Cos(ToRadians(fila.Latitude.Value)) *
                           Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
                           
                double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
                distanciaKm = R * c; 

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

        [HttpGet("guiches")]
        public async Task<IActionResult> ListarGuiches()
        {
            var guiches = await _context.Guiches.Where(g => g.Ativo).ToListAsync();
            return Ok(guiches);
        }

        [HttpGet("acesso-privado/{codigoAcesso}")]
        [Authorize]
        public async Task<IActionResult> ObterFilaPrivada(string codigoAcesso)
        {
            var fila = await _context.Filas
                .FirstOrDefaultAsync(f => f.Ativa && f.CodigoAcesso == codigoAcesso);

            if (fila == null)
            {
                return NotFound(new { message = "Fila privada não encontrada ou desativada." });
            }

            return Ok(fila);
        }

        // Endpoint parametrizado de forma robusta e independente
        [HttpPost("finalizar-ticket")]
        [Authorize]
        public async Task<IActionResult> FinalizarTicket([FromBody] FinalizarTicketDto request)
        {
            if (request == null || request.AtendimentoId <= 0)
            {
                return BadRequest(new { message = "O ID do atendimento é obrigatório e deve ser válido." });
            }

            var atendimento = await _context.Atendimentos.FindAsync(request.AtendimentoId);
            if (atendimento == null)
            {
                return NotFound(new { message = "Ticket não encontrado." });
            }

            atendimento.Status = "Finalizado";
            await _context.SaveChangesAsync();

            return Ok(new { message = "Ticket arquivado com sucesso!" });
        }
    }
}