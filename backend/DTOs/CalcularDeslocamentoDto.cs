using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class CalcularDeslocamentoDto
    {
        [Required]
        public int AtendimentoId { get; set; }

        [Required]
        public double LatitudeCliente { get; set; }

        [Required]
        public double LongitudeCliente { get; set; }
    }
}