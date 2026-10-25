using CenterManagement.Data.Entities.Notes;

namespace CenterManagement.Infrustructure.Data.Configurations.Notes;

public sealed class StudyNoteGroupConfiguration : IEntityTypeConfiguration<StudyNoteGroup>
{
    public void Configure(EntityTypeBuilder<StudyNoteGroup> builder)
    {
        builder.ToTable("StudyNoteGroups");

        builder.HasKey(x => new { x.StudyNoteId, x.GroupId });

        builder.HasOne(x => x.StudyNote)
            .WithMany(x => x.StudyNoteGroups)
            .HasForeignKey(x => x.StudyNoteId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Group)
            .WithMany()
            .HasForeignKey(x => x.GroupId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
