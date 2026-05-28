using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class Fila
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Nome { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string TipoServico { get; set; } = string.Empty;

        [Required]
        public int TempoMedioAtendimento { get; set; }

        [Required]
        public bool Ativa { get; set; } = true;

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }

        public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
    }
}