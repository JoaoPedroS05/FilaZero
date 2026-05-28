using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    public class DataContext : DbContext
    {
        public DataContext(DbContextOptions<DataContext> options) : base(options) { }

        public DbSet<Fila> Filas { get; set; }
        public DbSet<Atendimento> Atendimentos { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Guiche> Guiches { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. Carga Inicial de Guichês
            modelBuilder.Entity<Guiche>().HasData(
                new Guiche { Id = 1, NumeroOuNome = "Guichê 01", Ativo = true },
                new Guiche { Id = 2, NumeroOuNome = "Guichê 02", Ativo = true },
                new Guiche { Id = 3, NumeroOuNome = "Guichê 03", Ativo = true },
                new Guiche { Id = 4, NumeroOuNome = "Mesa de Atendimento A", Ativo = true }
            );

           // 2. Carga Inicial de um Usuário Administrador de Testes
            modelBuilder.Entity<Usuario>().HasData(
                new Usuario
                {
                    Id = 999,
                    Nome = "Administrador Sistema",
                    Email = "admin@filazero.com",
                    SenhaHash = BCrypt.Net.BCrypt.HashPassword("admin123"), 
                    Role = "Admin",
                    DataCriacao = new DateTime(2026, 5, 28, 0, 0, 0, DateTimeKind.Utc)
                }
            );
        }
    }
}