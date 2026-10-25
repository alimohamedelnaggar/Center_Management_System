using CenterManagement.Data.Entities.Teachers;

namespace CenterManagement.Infrustructure.Data.Configurations.Teachers;

public sealed class TeacherProfileConfiguration : IEntityTypeConfiguration<TeacherProfile>
{
    public void Configure(EntityTypeBuilder<TeacherProfile> builder)
    {
        builder.ToTable("TeacherProfiles");

        builder.Property(x => x.Subject).HasMaxLength(150);
        builder.Property(x => x.Bio).HasMaxLength(1000);

        builder.HasOne(x => x.User)
            .WithOne()
            .HasForeignKey<TeacherProfile>(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Center)
            .WithMany()
            .HasForeignKey(x => x.CenterId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => x.UserId).IsUnique();
    }
}
