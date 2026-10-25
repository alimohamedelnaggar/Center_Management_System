using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace CenterManagement.Infrustructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCentersAndTenant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "Students",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "Sessions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "Groups",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CenterId",
                table: "AspNetUsers",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Centers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    LogoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ThemeColor = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Centers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Centers_AspNetUsers_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Centers_Centers_CenterId",
                        column: x => x.CenterId,
                        principalTable: "Centers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "IdentityRole<Guid>",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { new Guid("44444444-4444-4444-4444-444444444444"), "44444444-4444-4444-4444-444444444444", "ProjectOwner", "PROJECTOWNER" },
                    { new Guid("55555555-5555-5555-5555-555555555555"), "55555555-5555-5555-5555-555555555555", "CenterOwner", "CENTEROWNER" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Students_CenterId",
                table: "Students",
                column: "CenterId");

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_CenterId",
                table: "Sessions",
                column: "CenterId");

            migrationBuilder.CreateIndex(
                name: "IX_Groups_CenterId",
                table: "Groups",
                column: "CenterId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_CenterId",
                table: "AspNetUsers",
                column: "CenterId");

            migrationBuilder.CreateIndex(
                name: "IX_Centers_CenterId",
                table: "Centers",
                column: "CenterId");

            migrationBuilder.CreateIndex(
                name: "IX_Centers_OwnerId",
                table: "Centers",
                column: "OwnerId",
                unique: true,
                filter: "[OwnerId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_Centers_CenterId",
                table: "AspNetUsers",
                column: "CenterId",
                principalTable: "Centers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Groups_Centers_CenterId",
                table: "Groups",
                column: "CenterId",
                principalTable: "Centers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Sessions_Centers_CenterId",
                table: "Sessions",
                column: "CenterId",
                principalTable: "Centers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Students_Centers_CenterId",
                table: "Students",
                column: "CenterId",
                principalTable: "Centers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_Centers_CenterId",
                table: "AspNetUsers");

            migrationBuilder.DropForeignKey(
                name: "FK_Groups_Centers_CenterId",
                table: "Groups");

            migrationBuilder.DropForeignKey(
                name: "FK_Sessions_Centers_CenterId",
                table: "Sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_Centers_CenterId",
                table: "Students");

            migrationBuilder.DropTable(
                name: "Centers");

            migrationBuilder.DropIndex(
                name: "IX_Students_CenterId",
                table: "Students");

            migrationBuilder.DropIndex(
                name: "IX_Sessions_CenterId",
                table: "Sessions");

            migrationBuilder.DropIndex(
                name: "IX_Groups_CenterId",
                table: "Groups");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_CenterId",
                table: "AspNetUsers");

            migrationBuilder.DeleteData(
                table: "IdentityRole<Guid>",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"));

            migrationBuilder.DeleteData(
                table: "IdentityRole<Guid>",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"));

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "CenterId",
                table: "AspNetUsers");
        }
    }
}
