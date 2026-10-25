using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CenterManagement.Infrustructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeParentPortalModuleDependencies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The parent portal now requires `attendance` + `payments` instead of
            // `student_portal`. Any center that has `parent_portal` enabled must
            // therefore also have both prerequisites on. This is a no-op on the
            // current data (0 centers violated the new rule) and only guards
            // legacy rows created under the old dependency graph.

            // 1) Turn on a disabled prerequisite where the center has the portal.
            migrationBuilder.Sql("""
                UPDATE cm
                SET cm.IsEnabled = 1,
                    cm.UpdatedAt = SYSUTCDATETIME()
                FROM CenterModules cm
                WHERE cm.IsDeleted = 0
                  AND cm.IsEnabled = 0
                  AND cm.ModuleKey IN ('attendance', 'payments')
                  AND cm.CenterId IN (
                      SELECT p.CenterId
                      FROM CenterModules p
                      WHERE p.ModuleKey = 'parent_portal'
                        AND p.IsEnabled = 1
                        AND p.IsDeleted = 0
                  );
                """);

            // 2) Provision a prerequisite row when it is missing entirely.
            migrationBuilder.Sql("""
                INSERT INTO CenterModules (Id, CenterId, ModuleKey, IsEnabled, IsDeleted, CreatedAt)
                SELECT NEWID(), p.CenterId, m.ModuleKey, 1, 0, SYSUTCDATETIME()
                FROM (
                    SELECT DISTINCT CenterId
                    FROM CenterModules
                    WHERE ModuleKey = 'parent_portal' AND IsEnabled = 1 AND IsDeleted = 0
                ) p
                CROSS JOIN (
                    SELECT 'attendance' AS ModuleKey
                    UNION ALL SELECT 'payments'
                ) m
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM CenterModules x
                    WHERE x.CenterId = p.CenterId
                      AND x.ModuleKey = m.ModuleKey
                      AND x.IsDeleted = 0
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data normalisation only; nothing is reversed. Disabling the
            // prerequisites again would re-introduce the inconsistent state.
        }
    }
}
