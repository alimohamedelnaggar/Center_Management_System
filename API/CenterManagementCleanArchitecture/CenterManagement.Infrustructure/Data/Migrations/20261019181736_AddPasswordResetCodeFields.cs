using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CenterManagement.Infrustructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordResetCodeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ResetCodeAttempts",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "ResetCodeExpiresAt",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResetCodeHash",
                table: "AspNetUsers",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ResetCodeSentAt",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            // Clear the legacy plaintext password-reset code column; the flow now
            // stores only a salted hash in ResetCodeHash.
            migrationBuilder.Sql("UPDATE [AspNetUsers] SET [Code] = NULL WHERE [Code] IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ResetCodeAttempts",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ResetCodeExpiresAt",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ResetCodeHash",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ResetCodeSentAt",
                table: "AspNetUsers");

            // The legacy plaintext Code column is only cleared (not dropped) in Up,
            // so there is nothing to restore here.
        }
    }
}
