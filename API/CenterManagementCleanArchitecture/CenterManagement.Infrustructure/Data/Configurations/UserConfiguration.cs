namespace CenterManagement.Infrustructure.Data.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        // Existing rows must not be locked out when the column is introduced.
        builder.Property(x => x.IsActive).HasDefaultValue(true);

        builder.Property(x => x.ResetCodeHash).HasMaxLength(255);
        builder.Property(x => x.ResetCodeAttempts).HasDefaultValue(0);

        builder.HasIndex(x => x.CenterId);
    }
}
