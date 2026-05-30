using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class CriarFilaDto
    {
        [Required(ErrorMessage = "O nome da fila é obrigatório.")]
        [StringLength(100, ErrorMessage = "O nome da fila não pode exceder 100 caracteres.")]
        public string Nome { get; set; } = string.Empty;

        [Required(ErrorMessage = "O tipo de serviço é obrigatório.")]
        [StringLength(100, ErrorMessage = "O tipo de serviço não pode exceder 100 caracteres.")]
        public string TipoServico { get; set; } = string.Empty;

        [Required(ErrorMessage = "O tempo médio de atendimento é obrigatório.")]
        [Range(1, 1440, ErrorMessage = "O tempo médio deve ser de pelo menos 1 minuto.")]
        public int TempoMedioAtendimento { get; set; }

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public bool EhPublica { get; set; }
    }
}