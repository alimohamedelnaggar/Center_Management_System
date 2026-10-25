namespace CenterManagement.Infrustructure.Data.Configurations.Groups;

public sealed class StudentGroupConfiguration : IEntityTypeConfiguration<StudentGroup>
{
    public void Configure(EntityTypeBuilder<StudentGroup> builder)
    {
        builder.ToTable("StudentGroups");

        builder.HasKey(x => new { x.StudentId, x.GroupId });

        builder.HasOne(x => x.Student)
            .WithMany(x => x.StudentGroups)
            .HasForeignKey(x => x.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Group)
            .WithMany(x => x.StudentGroups)
            .HasForeignKey(x => x.GroupId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
