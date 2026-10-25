using CenterManagement.Data.Entities.Users;

namespace CenterManagement.Infrustructure.Data.Configurations;

public sealed class ParentStudentLinkConfiguration : IEntityTypeConfiguration<ParentStudentLink>
{
    public void Configure(EntityTypeBuilder<ParentStudentLink> builder)
    {
        builder.ToTable("ParentStudentLinks");

        builder.HasKey(x => x.Id);

        // A parent is linked to a given child at most once.
        builder.HasIndex(x => new { x.ParentUserId, x.StudentId })
            .IsUnique();

        builder.HasIndex(x => x.StudentId);

        builder.HasOne(x => x.ParentUser)
            .WithMany()
            .HasForeignKey(x => x.ParentUserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Student)
            .WithMany()
            .HasForeignKey(x => x.StudentId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(x => x.Center)
            .WithMany()
            .HasForeignKey(x => x.CenterId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
