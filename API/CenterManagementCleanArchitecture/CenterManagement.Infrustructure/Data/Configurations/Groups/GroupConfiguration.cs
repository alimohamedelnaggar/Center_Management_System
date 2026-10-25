namespace CenterManagement.Infrustructure.Data.Configurations;

public sealed class GroupConfiguration : IEntityTypeConfiguration<Group>
{
    public void Configure(EntityTypeBuilder<Group> builder)
    {
        builder.ToTable("Groups");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.MonthlyPrice)
            .HasPrecision(18, 2);


        builder.HasMany(x => x.Sessions)
            .WithOne(x => x.Group)
            .HasForeignKey(x => x.GroupId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasMany(x => x.Exams)
            .WithOne(x => x.Group)
            .HasForeignKey(x => x.GroupId)
            .OnDelete(DeleteBehavior.Cascade);


        builder.HasMany(x => x.StudentGroups)
            .WithOne(x => x.Group)
            .HasForeignKey(x => x.GroupId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasMany(x => x.Payments)
            .WithOne(x => x.Group)
            .HasForeignKey(x => x.GroupId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.Property(x => x.SessionsPerMonth)
       .HasDefaultValue(8);
    }
}