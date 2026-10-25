using CenterManagement.Data.Enums;

namespace CenterManagement.Infrustructure.Data.Configurations.Groups;

public sealed class AttendanceConfiguration : IEntityTypeConfiguration<Attendance>
{
    public void Configure(EntityTypeBuilder<Attendance> builder)
    {
        builder.ToTable("Attendances");

        builder.HasKey(x => new { x.StudentId, x.SessionId, x.AttendanceDate });

        builder.Property(x => x.Status)
            .HasConversion<int>();

        // The enum starts at 1, so 0 is never a valid value; make it the explicit
        // sentinel so the database default is applied only when unset.
        builder.Property(x => x.Source)
            .HasConversion<int>()
            .HasDefaultValueSql("1")
            .HasSentinel((AttendanceSource)0);

        builder.Property(x => x.Notes)
            .HasMaxLength(500);


        builder.HasIndex(x => new
        {
            x.StudentId,
            x.SessionId,
            x.AttendanceDate
        }).IsUnique();
    }
}