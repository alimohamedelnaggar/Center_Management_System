using CenterManagement.Data.Entities.QuestionBank;

namespace CenterManagement.Infrustructure.Data.Configurations.QuestionBank;

public sealed class QuestionExamQuestionOptionConfiguration : IEntityTypeConfiguration<QuestionExamQuestionOption>
{
    public void Configure(EntityTypeBuilder<QuestionExamQuestionOption> builder)
    {
        builder.ToTable("QuestionExamQuestionOptions");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Text)
            .HasMaxLength(1000)
            .IsRequired();

        builder.HasIndex(x => new { x.QuestionExamQuestionId, x.Order })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0");
    }
}
