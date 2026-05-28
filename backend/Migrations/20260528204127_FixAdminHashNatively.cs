using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class FixAdminHashNatively : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Usuarios",
                keyColumn: "Id",
                keyValue: 999,
                column: "SenhaHash",
                value: "$2a$11$OfgPc.O3k8Fh/jCMQP8NAuybo06odeq/3DLH/f9SiIfK3o3DdZoOa");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Usuarios",
                keyColumn: "Id",
                keyValue: 999,
                column: "SenhaHash",
                value: "$2a$11$M2XvH17UoJv6N5PkhZEn/.F1A8h9r8Ebe4m8IlyXvA5D3Z7gq7KFe");
        }
    }
}
