using System;
using CenterManagement.Data.AppMetaData;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CenterManagement.Infrustructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionsAndCenterModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "GraceDays",
                table: "Centers",
                type: "int",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.CreateTable(
                name: "CenterModules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ModuleKey = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
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
                    table.PrimaryKey("PK_CenterModules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CenterModules_Centers_CenterId",
                        column: x => x.CenterId,
                        principalTable: "Centers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CenterSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Type = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Price = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PaidAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
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
                    table.PrimaryKey("PK_CenterSubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CenterSubscriptions_Centers_CenterId",
                        column: x => x.CenterId,
                        principalTable: "Centers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CenterSubscriptionPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CenterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CenterSubscriptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Method = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
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
                    table.PrimaryKey("PK_CenterSubscriptionPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CenterSubscriptionPayments_CenterSubscriptions_CenterSubscriptionId",
                        column: x => x.CenterSubscriptionId,
                        principalTable: "CenterSubscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CenterSubscriptionPayments_Centers_CenterId",
                        column: x => x.CenterId,
                        principalTable: "Centers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CenterModules_CenterId_ModuleKey",
                table: "CenterModules",
                columns: new[] { "CenterId", "ModuleKey" },
                unique: true,
                filter: "[CenterId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_CenterSubscriptionPayments_CenterId",
                table: "CenterSubscriptionPayments",
                column: "CenterId");

            migrationBuilder.CreateIndex(
                name: "IX_CenterSubscriptionPayments_CenterSubscriptionId",
                table: "CenterSubscriptionPayments",
                column: "CenterSubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_CenterSubscriptions_CenterId",
                table: "CenterSubscriptions",
                column: "CenterId");

            // ---------------------------------------------------------------------
            // Backfill (idempotent, safe to re-run).
            // Existing centers keep ALL optional modules enabled (a missing
            // CenterModules row means DISABLED, so we must create them), and get
            // one subscription row whose Type is derived from the real span:
            //   ~1 month  -> Monthly
            //   ~3 months -> Quarterly
            //   ~6 months -> SemiAnnual
            //   ~12 months-> Annual
            //   null end  -> Lifetime
            //   other span-> Annual (Notes = "مدة مخصصة")
            // Price/PaidAmount are 0 and Notes = "أُنشئ تلقائيًا".
            // Existing centers also receive the new default GraceDays = 3.
            // ---------------------------------------------------------------------

            // 1) Modules: one ENABLED row per (center, module) that doesn't exist yet.
            //    The key list is generated from ModuleKeys.All (single source of truth)
            //    so the SQL can never drift from the module catalog; a test guards it.
            var moduleValues = string.Join(",\n                    ",
                ModuleKeys.All.Select(key => $"('{key}')"));

            migrationBuilder.Sql($"""
                INSERT INTO [CenterModules] ([Id], [CenterId], [ModuleKey], [IsEnabled], [CreatedAt], [IsDeleted])
                SELECT NEWID(), c.[Id], m.[ModuleKey], 1, SYSUTCDATETIME(), 0
                FROM [Centers] c
                CROSS JOIN (VALUES
                    {moduleValues}
                ) AS m([ModuleKey])
                WHERE c.[IsDeleted] = 0
                  AND NOT EXISTS (
                      SELECT 1 FROM [CenterModules] cm
                      WHERE cm.[CenterId] = c.[Id] AND cm.[ModuleKey] = m.[ModuleKey]
                  );
                """);

            // 2) Subscriptions: one row per center that doesn't have one yet.
            migrationBuilder.Sql("""
                INSERT INTO [CenterSubscriptions]
                    ([Id], [CenterId], [Type], [StartDate], [EndDate], [Price], [PaidAmount], [Currency], [Notes], [CreatedAt], [IsDeleted])
                SELECT NEWID(),
                       s.[CenterId],
                       CASE
                           WHEN s.[EndDate] IS NULL            THEN 'Lifetime'
                           WHEN s.[Months] BETWEEN 1 AND 2     THEN 'Monthly'
                           WHEN s.[Months] BETWEEN 3 AND 4     THEN 'Quarterly'
                           WHEN s.[Months] BETWEEN 5 AND 8     THEN 'SemiAnnual'
                           WHEN s.[Months] BETWEEN 11 AND 13   THEN 'Annual'
                           ELSE 'Annual'
                       END,
                       s.[StartDate],
                       s.[EndDate],
                       0,
                       0,
                       NULL,
                       CASE
                           WHEN s.[EndDate] IS NULL THEN N'أُنشئ تلقائيًا'
                           WHEN s.[Months] BETWEEN 1 AND 2
                             OR s.[Months] BETWEEN 3 AND 4
                             OR s.[Months] BETWEEN 5 AND 8
                             OR s.[Months] BETWEEN 11 AND 13 THEN N'أُنشئ تلقائيًا'
                           ELSE N'مدة مخصصة'
                       END,
                       SYSUTCDATETIME(),
                       0
                FROM (
                    SELECT c.[Id] AS CenterId,
                           ISNULL(c.[SubscriptionStart], c.[CreatedAt]) AS StartDate,
                           c.[SubscriptionEnd] AS EndDate,
                           CASE WHEN c.[SubscriptionEnd] IS NULL THEN NULL
                                ELSE DATEDIFF(MONTH, ISNULL(c.[SubscriptionStart], c.[CreatedAt]), c.[SubscriptionEnd])
                           END AS Months
                    FROM [Centers] c
                    WHERE c.[IsDeleted] = 0
                      AND NOT EXISTS (SELECT 1 FROM [CenterSubscriptions] cs WHERE cs.[CenterId] = c.[Id])
                ) s;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CenterModules");

            migrationBuilder.DropTable(
                name: "CenterSubscriptionPayments");

            migrationBuilder.DropTable(
                name: "CenterSubscriptions");

            migrationBuilder.DropColumn(
                name: "GraceDays",
                table: "Centers");
        }
    }
}
