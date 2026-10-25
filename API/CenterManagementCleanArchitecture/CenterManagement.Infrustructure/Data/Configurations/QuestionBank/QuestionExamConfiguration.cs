using CenterManagement.Data.Entities.QuestionBank;

namespace CenterManagement.Infrustructure.Data.Configurations.QuestionBank;

public sealed class QuestionExamConfiguration : IEntityTypeConfiguration<QuestionExam>
{
    public void Configure(EntityTypeBuilder<QuestionExam> builder)
    {
        builder.ToTable("QuestionExams");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.HasOne(x => x.Group)
            .WithMany()
            .HasForeignKey(x => x.GroupId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.AcademicYear)
            .WithMany()
            .HasForeignKey(x => x.AcademicYearId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Questions)
            .WithOne(x => x.QuestionExam)
            .HasForeignKey(x => x.QuestionExamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.GroupId, x.AcademicYearId });
    }
}
