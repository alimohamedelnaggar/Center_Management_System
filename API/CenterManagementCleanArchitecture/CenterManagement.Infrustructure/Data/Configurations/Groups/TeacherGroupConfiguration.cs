namespace CenterManagement.Infrustructure.Data.Configurations.Groups;

public sealed class TeacherGroupConfiguration : IEntityTypeConfiguration<TeacherGroup>
{
    public void Configure(EntityTypeBuilder<TeacherGroup> builder)
    {
        builder.ToTable("TeacherGroups");

        builder.HasKey(x => new { x.TeacherId, x.GroupId });

        builder.HasOne(x => x.Teacher)
            .WithMany(x => x.TeacherGroups)
            .HasForeignKey(x => x.TeacherId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Group)
            .WithMany(x => x.TeacherGroups)
            .HasForeignKey(x => x.GroupId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
