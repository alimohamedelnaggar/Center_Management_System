namespace CenterManagement.Infrustructure.Data.Configurations.Seeder;

public sealed class RoleConfiguration : IEntityTypeConfiguration<IdentityRole<Guid>>
{
    public void Configure(EntityTypeBuilder<IdentityRole<Guid>> builder)
    {
        var assistantRole = new IdentityRole<Guid>
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            Name = "Assistant",
            NormalizedName = "ASSISTANT",
            ConcurrencyStamp = "22222222-2222-2222-2222-222222222222"
        };

        var studentRole = new IdentityRole<Guid>
        {
            Id = Guid.Parse("22222222-3333-2222-2222-222222222222"),
            Name = "Student",
            NormalizedName = "STUDENT",
            ConcurrencyStamp = "22222222-3333-2222-2222-222222222222"
        };

        var superAdminRole = new IdentityRole<Guid>
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            Name = "SuperAdmin",
            NormalizedName = "SUPERADMIN",
            ConcurrencyStamp = "44444444-4444-4444-4444-444444444444"
        };

        var centerOwnerRole = new IdentityRole<Guid>
        {
            Id = Guid.Parse("55555555-5555-5555-5555-555555555555"),
            Name = "CenterOwner",
            NormalizedName = "CENTEROWNER",
            ConcurrencyStamp = "55555555-5555-5555-5555-555555555555"
        };

        builder.HasData(assistantRole, studentRole, superAdminRole, centerOwnerRole);
    }
}
