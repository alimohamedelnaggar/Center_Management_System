namespace CenterManagement.Infrustructure.Data.Configurations;

public sealed class AssistentConfiguration : IEntityTypeConfiguration<Assistent>
{
    public void Configure(EntityTypeBuilder<Assistent> builder)
    {
        builder.ToTable("Assistents");

        // Assistant salary is money: pin the SQL Server precision so EF does not
        // silently truncate values that exceed the inferred default.
        builder.Property(a => a.Salary).HasPrecision(18, 2);

        // Optional assistant -> teacher link. Restrict to avoid multiple
        // cascade paths on the shared (TPT) Users table.
        builder.HasOne(a => a.Teacher)
            .WithMany()
            .HasForeignKey(a => a.TeacherId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}

