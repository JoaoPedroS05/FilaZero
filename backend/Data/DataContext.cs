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
            // hash estático gerado previamente para a senha "admin123" para evitar quebras no EF Core
            string hashEstaticoAdmin = "$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgqpl7oqiI.A8659ZInrE4uO8Wqu";

            modelBuilder.Entity<Usuario>().HasData(
                new Usuario
                {
                    Id = 999,
                    Nome = "Administrador Sistema",
                    Email = "admin@filazero.com",
                    SenhaHash = hashEstaticoAdmin, 
                    Role = "Admin",
                    DataCriacao = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            );
        }
    }
}