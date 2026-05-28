using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FilaController : ControllerBase
    {
        private readonly DataContext _context;

        public FilaController(DataContext context)
        {
            _context = context;
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

            return Ok(new { message = "Fila de atendimento criada com sucesso!", fila = novaFila });
        }

        // 2. Endpoint para listar todas as filas
        [HttpGet]
        public async Task<IActionResult> ListarFilas()
        {
            var filas = await _context.Filas.ToListAsync();
            return Ok(filas);
        }
    }
}