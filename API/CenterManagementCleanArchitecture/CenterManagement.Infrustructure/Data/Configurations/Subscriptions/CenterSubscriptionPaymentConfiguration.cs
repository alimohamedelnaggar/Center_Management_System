using CenterManagement.Data.Entities.Subscriptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CenterManagement.Infrustructure.Data.Configurations.Subscriptions;

public sealed class CenterSubscriptionPaymentConfiguration : IEntityTypeConfiguration<CenterSubscriptionPayment>
{
    public void Configure(EntityTypeBuilder<CenterSubscriptionPayment> builder)
    {
        builder.ToTable("CenterSubscriptionPayments");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.Method).HasMaxLength(64);
        builder.Property(x => x.Note).HasMaxLength(500);

        builder.HasIndex(x => x.CenterSubscriptionId);

        // Financial records must never be cascade-deleted. Both relationships use
        // Restrict (NoAction on SQL Server) so a subscription/center that still has
        // payments cannot be hard-deleted. This also avoids SQL Server
        // "multiple cascade paths" (Center -> payment direct, and
        // Center -> CenterSubscription -> payment).
        builder.HasOne(x => x.CenterSubscription)
            .WithMany(s => s.Payments)
            .HasForeignKey(x => x.CenterSubscriptionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Center)
            .WithMany()
            .HasForeignKey(x => x.CenterId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
