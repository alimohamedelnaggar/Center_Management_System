using CenterManagement.Data.Entities.Users;
using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Data.Entities.Exams
{
    public class StudentExamParentContact:BaseEntity, ITenantEntity
    {
        public Guid StudentId { get; set; }
        public Student Student { get; set; } = default!;

        public Guid ExamId { get; set; }
        public Exam Exam { get; set; } = default!;

        public bool IsContacted { get; set; } = false;

        public DateTime? ContactedAt { get; set; }

        public Guid? CenterId { get; set; }
    }
}
