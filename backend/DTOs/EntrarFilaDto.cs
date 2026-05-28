using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class EntrarFilaDto
    {
        [Required(ErrorMessage = "O ID da fila é obrigatório.")]
        public int FilaId { get; set; }
    }
}