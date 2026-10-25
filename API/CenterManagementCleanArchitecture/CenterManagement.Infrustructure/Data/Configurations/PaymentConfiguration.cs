using CenterManagement.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CenterManagement.Infrustructure.Data.Configurations;

public sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        // A receipt number is unique per center. Nullable so payments created
        // before the feature exist without one until they are backfilled; SQL
        // Server (and SQLite) treat NULLs as distinct in a unique index.
        builder.HasIndex(x => new { x.CenterId, x.ReceiptNumber })
            .IsUnique()
            .HasDatabaseName("IX_Payments_CenterId_ReceiptNumber");
    }
}
