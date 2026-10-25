using CenterManagement.Data.Entities.Exams;

namespace CenterManagement.Infrustructure.Data.Configurations.Exams;

public sealed class ExamConfiguration : IEntityTypeConfiguration<Exam>
{
    public void Configure(EntityTypeBuilder<Exam> builder)
    {
        builder.ToTable("Exams");

        builder.HasKey(x => x.Id);

        builder.HasMany(e => e.ExamComponents)
            .WithOne(e => e.Exam)
            .HasForeignKey(e => e.ExamId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
