using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CenterManagement.Infrustructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameSuperAdminRoleInAspNetRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The role seeded/used by Identity lives in AspNetRoles (not the
            // orphan "IdentityRole<Guid>" table). Rename the row in place so the
            // existing role assignment for user 01000000005 stays intact (same Id).
            migrationBuilder.Sql(
                "UPDATE [AspNetRoles] SET [Name] = 'SuperAdmin', [NormalizedName] = 'SUPERADMIN' WHERE [Name] = 'ProjectOwner';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE [AspNetRoles] SET [Name] = 'ProjectOwner', [NormalizedName] = 'PROJECTOWNER' WHERE [Name] = 'SuperAdmin';");
        }
    }
}
