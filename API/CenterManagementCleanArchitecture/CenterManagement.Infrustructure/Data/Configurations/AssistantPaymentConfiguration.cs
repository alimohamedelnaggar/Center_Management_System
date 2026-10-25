namespace CenterManagement.Infrustructure.Data.Configurations;

public sealed class AssistantPaymentConfiguration : IEntityTypeConfiguration<AssistantPayment>
{
    public void Configure(EntityTypeBuilder<AssistantPayment> builder)
    {
        builder.ToTable("AssistantPayments");

        // Salary breakdown values are money: pin precision/scale.
        builder.Property(x => x.BasicSalary).HasPrecision(18, 2);
        builder.Property(x => x.Bonus).HasPrecision(18, 2);
        builder.Property(x => x.Deduction).HasPrecision(18, 2);
        builder.Property(x => x.NetSalary).HasPrecision(18, 2);
    }
}
