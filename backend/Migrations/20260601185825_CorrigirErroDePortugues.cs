using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class CorrigirErroDePortugues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Usuarios",
                keyColumn: "Id",
                keyValue: 999,
                column: "SenhaHash",
                value: "$2a$11$.TyOJJBTk6Wvh0SvWZUWiuHblPQr1TJUDZ7AkEqOjT0s5zZDJciXi");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Usuarios",
                keyColumn: "Id",
                keyValue: 999,
                column: "SenhaHash",
                value: "$2a$11$qJmhSkzQGg9L7p28xgMFPOiEz53WES3r9/xm15E6wbFmta67.T.JO");
        }
    }
}
