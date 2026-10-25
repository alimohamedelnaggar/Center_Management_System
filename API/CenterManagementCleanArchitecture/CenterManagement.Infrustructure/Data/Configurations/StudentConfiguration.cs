namespace CenterManagement.Infrustructure.Data.Configurations;

public sealed class StudentConfiguration : IEntityTypeConfiguration<Student>
{
    public void Configure(EntityTypeBuilder<Student> builder)
    {
        builder.ToTable("Students");

        builder.Property(x => x.CustomMonthlyPrice).HasPrecision(18, 2);

        builder.Property(x => x.ParentPhoneNumber)
            .HasMaxLength(15);

        builder.Property(x => x.PhoneNumber)
            .HasMaxLength(15);

        builder.Property(x => x.School)
            .HasMaxLength(200);

        builder.Property(x => x.Notes)
            .HasMaxLength(1000);

        builder.Property(x => x.QrCode)
            .HasMaxLength(20)
            .IsRequired(false);

        builder.HasIndex(x => x.QrCode)
            .IsUnique()
            .HasFilter("[QrCode] IS NOT NULL");

        builder.HasOne(x => x.User)
            .WithOne()
            .HasForeignKey<Student>(x => x.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => x.UserId)
            .IsUnique()
            .HasFilter("[UserId] IS NOT NULL");

        builder.HasMany(x => x.Attendances)
            .WithOne(x => x.Student)
            .HasForeignKey(x => x.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.Payments)
            .WithOne(x => x.Student)
            .HasForeignKey(x => x.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.StudentExams)
            .WithOne(x => x.Student)
            .HasForeignKey(x => x.StudentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

