using CenterManagement.Data.Entities.Notes;

namespace CenterManagement.Infrustructure.Data.Configurations.Notes;

public sealed class StudyNoteConfiguration : IEntityTypeConfiguration<StudyNote>
{
    public void Configure(EntityTypeBuilder<StudyNote> builder)
    {
        builder.ToTable("StudyNotes");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.Description)
            .HasMaxLength(1000);

        builder.Property(x => x.FileName)
            .HasMaxLength(300)
            .IsRequired();

        builder.Property(x => x.OriginalFileName)
            .HasMaxLength(300)
            .IsRequired();

        builder.HasMany(x => x.StudyNoteGroups)
            .WithOne(x => x.StudyNote)
            .HasForeignKey(x => x.StudyNoteId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
