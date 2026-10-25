using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CenterManagement.Infrustructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAssistantTeacherLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TeacherId",
                table: "Assistents",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Assistents_TeacherId",
                table: "Assistents",
                column: "TeacherId");

            migrationBuilder.AddForeignKey(
                name: "FK_Assistents_AspNetUsers_TeacherId",
                table: "Assistents",
                column: "TeacherId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assistents_AspNetUsers_TeacherId",
                table: "Assistents");

            migrationBuilder.DropIndex(
                name: "IX_Assistents_TeacherId",
                table: "Assistents");

            migrationBuilder.DropColumn(
                name: "TeacherId",
                table: "Assistents");
        }
    }
}
