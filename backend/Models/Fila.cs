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
        public int TempoMedioAtendimento { get; set; } // Armazenado em minutos

        [Required]
        public bool Ativa { get; set; } = true;

        public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
    }
}