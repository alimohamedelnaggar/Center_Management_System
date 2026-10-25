using CenterManagement.Data.Entities.Expenses;

namespace CenterManagement.Infrustructure.Data.Configurations.Expenses;

public sealed class ExpenseCategoryConfiguration : IEntityTypeConfiguration<ExpenseCategory>
{
    public void Configure(EntityTypeBuilder<ExpenseCategory> builder)
    {
        builder.ToTable("ExpenseCategories");

        builder.Property(x => x.Name)
            .HasMaxLength(200)
            .IsRequired();
        builder.HasMany(x => x.Expenses)
            .WithOne(x => x.Category)
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

