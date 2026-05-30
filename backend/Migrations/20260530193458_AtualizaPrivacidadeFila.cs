using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AtualizaPrivacidadeFila : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Usuarios",
                keyColumn: "Id",
                keyValue: 999,
                column: "SenhaHash",
                value: "$2a$11$qJmhSkzQGg9L7p28xgMFPOiEz53WES3r9/xm15E6wbFmta67.T.JO");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Usuarios",
                keyColumn: "Id",
                keyValue: 999,
                column: "SenhaHash",
                value: "$2a$11$uplI/LQFacvR78EE3o8eTOqVaKVQouqPsAqMOWd1wdH76rF/BZaS2");
        }
    }
}
