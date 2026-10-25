using CenterManagement.Data.Entities.Subscriptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CenterManagement.Infrustructure.Data.Configurations.Subscriptions;

public sealed class CenterSubscriptionConfiguration : IEntityTypeConfiguration<CenterSubscription>
{
    public void Configure(EntityTypeBuilder<CenterSubscription> builder)
    {
        builder.ToTable("CenterSubscriptions");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Type)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(x => x.Price).HasPrecision(18, 2);
        builder.Property(x => x.PaidAmount).HasPrecision(18, 2);
        builder.Property(x => x.Currency).HasMaxLength(8);
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => x.CenterId);

        builder.HasOne(x => x.Center)
            .WithMany(c => c.Subscriptions)
            .HasForeignKey(x => x.CenterId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
