using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddFilaPrivadaFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CodigoAcesso",
                table: "Filas",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "EhPublica",
                table: "Filas",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "Usuarios",
                keyColumn: "Id",
                keyValue: 999,
                column: "SenhaHash",
                value: "$2a$11$uplI/LQFacvR78EE3o8eTOqVaKVQouqPsAqMOWd1wdH76rF/BZaS2");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CodigoAcesso",
                table: "Filas");

            migrationBuilder.DropColumn(
                name: "EhPublica",
                table: "Filas");

            migrationBuilder.UpdateData(
                table: "Usuarios",
                keyColumn: "Id",
                keyValue: 999,
                column: "SenhaHash",
                value: "$2a$11$OfgPc.O3k8Fh/jCMQP8NAuybo06odeq/3DLH/f9SiIfK3o3DdZoOa");
        }
    }
}
