using CenterManagement.Data.Entities.QuestionBank;

namespace CenterManagement.Infrustructure.Data.Configurations.QuestionBank;

public sealed class StudentExamAnswerConfiguration : IEntityTypeConfiguration<StudentExamAnswer>
{
    public void Configure(EntityTypeBuilder<StudentExamAnswer> builder)
    {
        builder.ToTable("StudentExamAnswers");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.EssayAnswer)
            .HasMaxLength(4000);

        builder.Property(x => x.AwardedMark)
            .HasColumnType("decimal(18,2)");

        builder.HasIndex(x => x.AttemptId);
    }
}
