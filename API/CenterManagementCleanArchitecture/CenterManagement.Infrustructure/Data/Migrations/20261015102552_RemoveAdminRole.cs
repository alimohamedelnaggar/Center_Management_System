using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CenterManagement.Infrustructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAdminRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "IdentityRole<Guid>",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"));

            // Retire the "Admin" role: former admin accounts are converted to
            // center staff, then the role and all its assignments/claims are removed.
            migrationBuilder.Sql(@"
DECLARE @adminRole uniqueidentifier = (SELECT TOP 1 Id FROM AspNetRoles WHERE NormalizedName = N'ADMIN');
DECLARE @teacherRole uniqueidentifier = (SELECT TOP 1 Id FROM AspNetRoles WHERE NormalizedName = N'TEACHER');
DECLARE @demoCenter uniqueidentifier = '4EF6A092-022B-4A2A-93E7-BA1621BD123B';

-- Every account holding the retired Admin role is reassigned (never deleted):
-- it becomes a Teacher of the demo center with a TeacherProfile, so no former
-- admin is left role-less and no teacher ends up with CenterId = NULL.
IF @adminRole IS NOT NULL AND @teacherRole IS NOT NULL
BEGIN
    INSERT INTO AspNetUserRoles (UserId, RoleId)
    SELECT ur.UserId, @teacherRole
    FROM AspNetUserRoles ur
    WHERE ur.RoleId = @adminRole
      AND NOT EXISTS (SELECT 1 FROM AspNetUserRoles x
                      WHERE x.UserId = ur.UserId AND x.RoleId = @teacherRole);

    UPDATE AspNetUsers
    SET CenterId = @demoCenter
    WHERE CenterId IS NULL
      AND Id IN (SELECT UserId FROM AspNetUserRoles WHERE RoleId = @adminRole);

    INSERT INTO TeacherProfiles (Id, UserId, CenterId, CreatedAt, IsDeleted)
    SELECT NEWID(), u.Id, @demoCenter, SYSUTCDATETIME(), 0
    FROM AspNetUsers u
    WHERE u.Id IN (SELECT UserId FROM AspNetUserRoles WHERE RoleId = @adminRole)
      AND NOT EXISTS (SELECT 1 FROM TeacherProfiles tp WHERE tp.UserId = u.Id);
END

IF @adminRole IS NOT NULL
BEGIN
    DELETE FROM AspNetUserRoles WHERE RoleId = @adminRole;
    DELETE FROM AspNetRoleClaims WHERE RoleId = @adminRole;
    DELETE FROM AspNetRoles WHERE Id = @adminRole;
END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "IdentityRole<Guid>",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[] { new Guid("11111111-1111-1111-1111-111111111111"), "11111111-1111-1111-1111-111111111111", "Admin", "ADMIN" });
        }
    }
}
