using QuestionBankEntity = CenterManagement.Data.Entities.QuestionBank.QuestionBank;

namespace CenterManagement.Infrustructure.Data.Configurations.QuestionBank;

public sealed class QuestionBankConfiguration : IEntityTypeConfiguration<QuestionBankEntity>
{
    public void Configure(EntityTypeBuilder<QuestionBankEntity> builder)
    {
        builder.ToTable("QuestionBanks");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name)
            .HasMaxLength(150)
            .IsRequired();

        builder.HasIndex(x => new { x.Name, x.AcademicYearId })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0");

        builder
            .HasMany(x => x.Questions)
            .WithOne(x => x.QuestionBank)
            .HasForeignKey(x => x.QuestionBankId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}