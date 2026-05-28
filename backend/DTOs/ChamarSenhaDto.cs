using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class ChamarSenhaDto
    {
        [Required(ErrorMessage = "O ID da fila é obrigatório.")]
        public int FilaId { get; set; }

        [Required(ErrorMessage = "O ID do guichê que está chamando a senha é obrigatório.")]
        public int GuicheId { get; set; }
    }
}