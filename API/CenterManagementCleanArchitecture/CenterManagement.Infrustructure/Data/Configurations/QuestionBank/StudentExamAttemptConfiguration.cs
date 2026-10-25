using CenterManagement.Data.Entities.QuestionBank;

namespace CenterManagement.Infrustructure.Data.Configurations.QuestionBank;

public sealed class StudentExamAttemptConfiguration : IEntityTypeConfiguration<StudentExamAttempt>
{
    public void Configure(EntityTypeBuilder<StudentExamAttempt> builder)
    {
        builder.ToTable("StudentExamAttempts");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Score)
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.TotalMark)
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.ViolationLog)
            .HasMaxLength(1000);

        builder.Property(x => x.ViolationTimeline)
            .HasMaxLength(4000);

        builder.HasOne(x => x.QuestionExam)
            .WithMany()
            .HasForeignKey(x => x.QuestionExamId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Student)
            .WithMany()
            .HasForeignKey(x => x.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Answers)
            .WithOne(x => x.Attempt)
            .HasForeignKey(x => x.AttemptId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.QuestionExamId, x.StudentId });
    }
}
