using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class Guiche
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string NumeroOuNome { get; set; } = string.Empty;

        public int? FilaIdAtendimento { get; set; }
        public Fila? FilaAtendimento { get; set; }

        public bool Ativo { get; set; } = true;
    }
}