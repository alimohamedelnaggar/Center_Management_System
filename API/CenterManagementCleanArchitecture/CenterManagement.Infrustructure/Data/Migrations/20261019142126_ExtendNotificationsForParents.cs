using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CenterManagement.Infrustructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ExtendNotificationsForParents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Notifications",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<Guid>(
                name: "ParentUserId",
                table: "Notifications",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "StudentId",
                table: "Notifications",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_ParentUserId_IsRead",
                table: "Notifications",
                columns: new[] { "ParentUserId", "IsRead" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_ParentUserId_StudentId",
                table: "Notifications",
                columns: new[] { "ParentUserId", "StudentId" });

            migrationBuilder.CreateIndex(
                name: "UX_Notifications_Parent_Dedup",
                table: "Notifications",
                columns: new[] { "ParentUserId", "Type", "ReferenceType", "ReferenceId" },
                unique: true,
                filter: "[ParentUserId] IS NOT NULL AND [ReferenceType] IS NOT NULL AND [ReferenceId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notifications_ParentUserId_IsRead",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_ParentUserId_StudentId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "UX_Notifications_Parent_Dedup",
                table: "Notifications");

            // Parent rows stored their recipient in ParentUserId; fold it back
            // into the old non-nullable UserId so the column can be tightened
            // again without losing them.
            migrationBuilder.Sql(
                "UPDATE [Notifications] SET [UserId] = [ParentUserId] WHERE [UserId] IS NULL AND [ParentUserId] IS NOT NULL;");

            migrationBuilder.DropColumn(
                name: "ParentUserId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "StudentId",
                table: "Notifications");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Notifications",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}
