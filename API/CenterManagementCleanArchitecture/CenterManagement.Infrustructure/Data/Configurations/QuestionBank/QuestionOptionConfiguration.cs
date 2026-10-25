using CenterManagement.Data.Entities.QuestionBank;

namespace CenterManagement.Infrustructure.Data.Configurations.QuestionBank;

public sealed class QuestionOptionConfiguration : IEntityTypeConfiguration<QuestionOption>
{
    public void Configure(EntityTypeBuilder<QuestionOption> builder)
    {
        builder.ToTable("QuestionOptions");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Text)
            .HasMaxLength(1000)
            .IsRequired();

        builder.HasIndex(x => new { x.QuestionId, x.Order })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0");
    }
}