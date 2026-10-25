namespace CenterManagement.Infrustructure.Data.Configurations.Groups;

public sealed class SessionConfiguration : IEntityTypeConfiguration<Session>
{
    public void Configure(EntityTypeBuilder<Session> builder)
    {
        builder.ToTable("Sessions");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.SessionPrice).HasPrecision(18, 2);

        builder.HasOne(x => x.Group)
            .WithMany(x => x.Sessions)
            .HasForeignKey(x => x.GroupId)
            .OnDelete(DeleteBehavior.NoAction);


        builder.Property(x => x.StartTime)
            .IsRequired();

        builder.Property(x => x.EndTime)
            .IsRequired();


        builder.HasMany(x => x.Payments)
            .WithOne(x => x.Session)
            .HasForeignKey(x => x.SessionId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasMany(x => x.Exams)
            .WithOne(x => x.Session)
            .HasForeignKey(x => x.SessionId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasMany(x => x.Attendances)
            .WithOne(x => x.Session)
            .HasForeignKey(x => x.SessionId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
