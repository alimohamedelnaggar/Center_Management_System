using CenterManagement.Data.Entities.Exams;

namespace CenterManagement.Infrustructure.Data.Configurations.Exams;

public sealed class StudentExamComponentConfiguration : IEntityTypeConfiguration<StudentExamComponent>
{
    public void Configure(EntityTypeBuilder<StudentExamComponent> builder)
    {
        builder.ToTable("StudentExamComponents");

        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.Student)
            .WithMany(x => x.StudentExams)
            .HasForeignKey(x => x.StudentId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.Student)
            .WithMany(x => x.StudentExams)
            .HasForeignKey(x => x.StudentId)
            .OnDelete(DeleteBehavior.NoAction);

       

        builder.Property(x => x.Mark)
            .HasColumnType("decimal(18,2)");
    }
}
