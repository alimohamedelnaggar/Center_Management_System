using CenterManagement.Data.Entities.Subscriptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CenterManagement.Infrustructure.Data.Configurations.Subscriptions;

public sealed class CenterModuleConfiguration : IEntityTypeConfiguration<CenterModule>
{
    public void Configure(EntityTypeBuilder<CenterModule> builder)
    {
        builder.ToTable("CenterModules");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.ModuleKey)
            .HasMaxLength(64)
            .IsRequired();

        builder.HasIndex(x => new { x.CenterId, x.ModuleKey })
            .IsUnique();

        builder.HasOne(x => x.Center)
            .WithMany(c => c.Modules)
            .HasForeignKey(x => x.CenterId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
