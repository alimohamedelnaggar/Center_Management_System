using CenterManagement.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CenterManagement.Infrustructure.Data.Configurations;

public sealed class StudentAmountConfiguration : IEntityTypeConfiguration<StudentAmount>
{
    public void Configure(EntityTypeBuilder<StudentAmount> builder)
    {
        builder.ToTable("StudentAmounts");

        // Monetary values: pin precision/scale so EF never truncates silently.
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.TotalAmount).HasPrecision(18, 2);
        builder.Property(x => x.PaidAmount).HasPrecision(18, 2);
        builder.Property(x => x.RemainingAmount).HasPrecision(18, 2);
    }
}
