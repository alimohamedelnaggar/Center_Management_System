using CenterManagement.Data.Entities;
using CenterManagement.Data.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CenterManagement.Infrustructure.Data.Configurations;

public sealed class CenterConfiguration : IEntityTypeConfiguration<Center>
{
    public void Configure(EntityTypeBuilder<Center> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);

        builder.Property(x => x.Plan).HasMaxLength(100);
        builder.Property(x => x.Notes).HasMaxLength(1000);

        // The enums start at 1, so 0 is never a valid value; make it the explicit
        // sentinel so the database default is applied only when the caller left
        // the property unset (and the CLR default of 0 is never stored).
        builder.Property(x => x.Type)
            .HasDefaultValue(CenterType.MultiTeacher)
            .HasSentinel((CenterType)0);

        builder.Property(x => x.Status)
            .HasDefaultValue(CenterStatus.Active)
            .HasSentinel((CenterStatus)0);

        builder.HasOne(x => x.Owner)
            .WithOne()
            .HasForeignKey<Center>(x => x.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(x => x.SubCenters)
            .WithOne()
            .OnDelete(DeleteBehavior.Restrict);
    }
}
