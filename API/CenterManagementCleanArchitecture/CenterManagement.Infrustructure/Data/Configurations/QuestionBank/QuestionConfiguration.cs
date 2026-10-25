using CenterManagement.Data.Entities.QuestionBank;

namespace CenterManagement.Infrustructure.Data.Configurations.QuestionBank;

public sealed class QuestionConfiguration : IEntityTypeConfiguration<Question>
{
    public void Configure(EntityTypeBuilder<Question> builder)
    {
        builder.ToTable("Questions");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Mark)
            .HasColumnType("decimal(18,2)")
            .HasDefaultValue(1m);

        builder.Property(x => x.Text)
            .HasMaxLength(2000);

        builder.Property(x => x.ImageName)
            .HasMaxLength(500);

        builder
            .HasMany(x => x.Options)
            .WithOne(x => x.Question)
            .HasForeignKey(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}