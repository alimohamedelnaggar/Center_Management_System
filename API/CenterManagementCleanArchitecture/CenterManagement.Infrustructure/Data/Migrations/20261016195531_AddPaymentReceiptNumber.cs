using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CenterManagement.Infrustructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentReceiptNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ReceiptNumber",
                table: "Payments",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CenterReceiptCounters",
                columns: table => new
                {
                    CenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LastNumber = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CenterReceiptCounters", x => x.CenterId);
                });

            // Backfill: number the existing payments per center in CreatedAt
            // order (Id breaks ties). Only ReceiptNumber is written; no other
            // column is touched and no row is deleted.
            migrationBuilder.Sql(
                @";WITH Numbered AS (
                      SELECT Id,
                             ROW_NUMBER() OVER (PARTITION BY CenterId ORDER BY CreatedAt, Id) AS rn
                      FROM Payments
                      WHERE CenterId IS NOT NULL
                  )
                  UPDATE p SET p.ReceiptNumber = n.rn
                  FROM Payments p
                  INNER JOIN Numbered n ON n.Id = p.Id;");

            // Seed the per-center counter with the highest number just assigned
            // so the next payment continues the sequence.
            migrationBuilder.Sql(
                @"INSERT INTO CenterReceiptCounters (CenterId, LastNumber)
                  SELECT CenterId, MAX(ReceiptNumber)
                  FROM Payments
                  WHERE CenterId IS NOT NULL AND ReceiptNumber IS NOT NULL
                  GROUP BY CenterId;");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_CenterId_ReceiptNumber",
                table: "Payments",
                columns: new[] { "CenterId", "ReceiptNumber" },
                unique: true,
                filter: "[CenterId] IS NOT NULL AND [ReceiptNumber] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CenterReceiptCounters");

            migrationBuilder.DropIndex(
                name: "IX_Payments_CenterId_ReceiptNumber",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "ReceiptNumber",
                table: "Payments");
        }
    }
}
