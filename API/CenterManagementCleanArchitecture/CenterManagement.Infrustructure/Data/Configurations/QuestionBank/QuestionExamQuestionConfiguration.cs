using CenterManagement.Data.Entities.QuestionBank;

namespace CenterManagement.Infrustructure.Data.Configurations.QuestionBank;

public sealed class QuestionExamQuestionConfiguration : IEntityTypeConfiguration<QuestionExamQuestion>
{
    public void Configure(EntityTypeBuilder<QuestionExamQuestion> builder)
    {
        builder.ToTable("QuestionExamQuestions");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Mark)
            .HasColumnType("decimal(18,2)");

        builder.HasMany(x => x.Options)
            .WithOne(x => x.QuestionExamQuestion)
            .HasForeignKey(x => x.QuestionExamQuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.QuestionExamId, x.Order })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0");
    }
}
