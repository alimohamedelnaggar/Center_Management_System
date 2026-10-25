using CenterManagement.Data.Entities.Exams;

namespace CenterManagement.Infrustructure.Data.Configurations.Exams;

public sealed class ExamComponentConfiguration : IEntityTypeConfiguration<ExamComponent>
{
    public void Configure(EntityTypeBuilder<ExamComponent> builder)
    {
        builder.ToTable("ExamComponents");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.TotalMarks)
            .HasColumnType("decimal(18,2)");

        builder
        .HasMany(x => x.StudentMarks)
        .WithOne(x => x.ExamComponent)
        .HasForeignKey(x => x.ExamComponentId)
        .OnDelete(DeleteBehavior.NoAction);

    }
}
