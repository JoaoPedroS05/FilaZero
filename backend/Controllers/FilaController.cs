using backend.Data;
using backend.DTOs;
using backend.Hubs;
using backend.Models;
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

        public FilaController(DataContext context, IHubContext<FilaHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
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
            // Conta quantos atendimentos já foram criados hoje ou no total para essa fila
            int totalAtendimentosFila = await _context.Atendimentos
                .CountAsync(a => a.FilaId == request.FilaId);
            
            int proximoNumero = totalAtendimentosFila + 1;
            // Formata a senha com base nas primeiras 3 letras do nome da fila
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
            // 1. Extrair o ID do Usuário do Token JWT
            var usuarioIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(usuarioIdClaim))
            {
                return Unauthorized(new { message = "Usuário não identificado no token." });
            }
            int usuarioId = int.Parse(usuarioIdClaim);

            // 2. Buscar atendimentos ativos (Aguardando ou Chamado) trazendo os dados da Fila junto (Include)
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
            // 1. Buscar o próximo atendimento com status "Aguardando" para a fila informada (ordenado por data/ID)
            var proximoAtendimento = await _context.Atendimentos
                .Where(a => a.FilaId == request.FilaId && a.Status == "Aguardando")
                .OrderBy(a => a.DataHoraEntrada)
                .FirstOrDefaultAsync();

            if (proximoAtendimento == null)
            {
                return NotFound(new { message = "Não há nenhuma senha aguardando nesta fila." });
            }

            // 2. Mudar o status para "Chamado"
            proximoAtendimento.Status = "Chamado";
            proximoAtendimento.DataHoraAtendimento = DateTime.UtcNow;

            // 3. Atualizar a posição de TODOS os outros que ainda estão esperando nessa fila (subtrair 1)
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

            // 4. Notificar TODOS os conectados via SignalR
            // O evento "SenhaChamada" envia o número da senha e o ID da fila que andou
            await _hubContext.Clients.All.SendAsync("SenhaChamada", new { 
                senha = proximoAtendimento.Senha, 
                filaId = request.FilaId 
            });
            
            // Também disparamos o "AtualizarFila" para atualizar as posições na tela dos clientes
            await _hubContext.Clients.All.SendAsync("AtualizarFila", request.FilaId);

            return Ok(new { message = $"Senha {proximoAtendimento.Senha} chamada com sucesso!", atendimento = proximoAtendimento });
        }
    
    }
}