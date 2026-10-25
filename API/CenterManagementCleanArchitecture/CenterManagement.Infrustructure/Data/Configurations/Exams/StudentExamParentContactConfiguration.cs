using CenterManagement.Data.Entities.Exams;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CenterManagement.Infrustructure.Configurations;

public class StudentExamParentContactConfiguration
    : IEntityTypeConfiguration<StudentExamParentContact>
{
    public void Configure(
        EntityTypeBuilder<StudentExamParentContact> builder)
    {
        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.Student)
            .WithMany(x => x.ExamParentContacts)
            .HasForeignKey(x => x.StudentId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(x => x.Exam)
            .WithMany(x => x.ParentContacts)
            .HasForeignKey(x => x.ExamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(x => x.IsContacted)
            .IsRequired();

        builder.Property(x => x.ContactedAt)
            .IsRequired(false);

        builder.HasIndex(x => new
        {
            x.StudentId,
            x.ExamId
        })
        .IsUnique();
    }
}