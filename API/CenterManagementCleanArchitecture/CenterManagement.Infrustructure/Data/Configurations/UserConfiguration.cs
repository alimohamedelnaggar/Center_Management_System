namespace CenterManagement.Infrustructure.Data.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        // Existing rows must not be locked out when the column is introduced.
        builder.Property(x => x.IsActive).HasDefaultValue(true);

        builder.Property(x => x.ResetCodeHash).HasMaxLength(255);
        builder.Property(x => x.ResetCodeAttempts).HasDefaultValue(0);

        // Staged self-service email changes use the same limit as Identity's
        // Email column so the committed and pending addresses stay consistent.
        builder.Property(x => x.PendingEmail).HasMaxLength(256);

        builder.HasIndex(x => x.CenterId);
    }
}
