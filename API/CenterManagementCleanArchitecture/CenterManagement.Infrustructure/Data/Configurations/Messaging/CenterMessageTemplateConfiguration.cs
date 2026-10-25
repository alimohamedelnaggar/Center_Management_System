using CenterManagement.Data.Entities.Messaging;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CenterManagement.Infrustructure.Data.Configurations.Messaging;

public sealed class CenterMessageTemplateConfiguration
    : IEntityTypeConfiguration<CenterMessageTemplate>
{
    public void Configure(EntityTypeBuilder<CenterMessageTemplate> builder)
    {
        builder.ToTable("CenterMessageTemplates");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Type)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(x => x.Body)
            .HasMaxLength(500)
            .IsRequired();

        builder.HasIndex(x => new
        {
            x.CenterId,
            x.Type
        })
        .IsUnique();
    }
}
