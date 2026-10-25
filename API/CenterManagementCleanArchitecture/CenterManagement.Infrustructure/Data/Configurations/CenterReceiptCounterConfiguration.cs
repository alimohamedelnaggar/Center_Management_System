using CenterManagement.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CenterManagement.Infrustructure.Data.Configurations;

public sealed class CenterReceiptCounterConfiguration : IEntityTypeConfiguration<CenterReceiptCounter>
{
    public void Configure(EntityTypeBuilder<CenterReceiptCounter> builder)
    {
        builder.ToTable("CenterReceiptCounters");

        builder.HasKey(x => x.CenterId);

        builder.Property(x => x.CenterId).ValueGeneratedNever();
        builder.Property(x => x.LastNumber).IsRequired();
    }
}
