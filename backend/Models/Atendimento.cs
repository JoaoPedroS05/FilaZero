using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    public class Atendimento
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int FilaId { get; set; }
        
        [ForeignKey("FilaId")]
        public Fila? Fila { get; set; }

        [Required]
        public int UsuarioId { get; set; }

        [ForeignKey("UsuarioId")]
        public Usuario? Usuario { get; set; }

        [Required]
        [StringLength(10)]
        public string Senha { get; set; } = string.Empty; 

        [Required]
        public int Posicao { get; set; } 

        [Required]
        public string Status { get; set; } = "Aguardando"; 

        public int? GuicheId { get; set; }

        [ForeignKey("GuicheId")]
        public Guiche? Guiche { get; set; }

        public DateTime DataHoraEntrada { get; set; } = DateTime.UtcNow;
        public DateTime? DataHoraAtendimento { get; set; }
    }
}