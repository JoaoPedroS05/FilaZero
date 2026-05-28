using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddRolesAndGuiches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Usuarios",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(150)",
                oldMaxLength: 150)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Usuarios",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "GuicheId",
                table: "Atendimentos",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Guiches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    NumeroOuNome = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FilaIdAtendimento = table.Column<int>(type: "int", nullable: true),
                    FilaAtendimentoId = table.Column<int>(type: "int", nullable: true),
                    Ativo = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Guiches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Guiches_Filas_FilaAtendimentoId",
                        column: x => x.FilaAtendimentoId,
                        principalTable: "Filas",
                        principalColumn: "Id");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Atendimentos_GuicheId",
                table: "Atendimentos",
                column: "GuicheId");

            migrationBuilder.CreateIndex(
                name: "IX_Guiches_FilaAtendimentoId",
                table: "Guiches",
                column: "FilaAtendimentoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Atendimentos_Guiches_GuicheId",
                table: "Atendimentos",
                column: "GuicheId",
                principalTable: "Guiches",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Atendimentos_Guiches_GuicheId",
                table: "Atendimentos");

            migrationBuilder.DropTable(
                name: "Guiches");

            migrationBuilder.DropIndex(
                name: "IX_Atendimentos_GuicheId",
                table: "Atendimentos");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "GuicheId",
                table: "Atendimentos");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Usuarios",
                type: "varchar(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(100)",
                oldMaxLength: 100)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");
        }
    }
}
