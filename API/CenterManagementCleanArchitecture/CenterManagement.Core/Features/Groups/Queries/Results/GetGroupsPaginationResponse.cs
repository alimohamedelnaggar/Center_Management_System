

namespace CenterManagement.Core.Features.Groups.Queries.Results
{
    public class GetGroupsPaginationResponse
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = default!;

        public decimal MonthlyPrice { get; set; }
        public int SessionsPerMonth { get; set; }

        public int TotalStudentsCount { get; set; }

        /// <summary>Currently linked teacher (multi-teacher centers only) so the
        /// edit form can preload the dropdown without dropping the link.</summary>
        public Guid? TeacherId { get; set; }

        /// <summary>Subject of the single teacher of a solo center. Null for
        /// multi-teacher centers (which show the teacher instead).</summary>
        public string? SoloTeacherSubject { get; set; }

        /// <summary>Type of the center ("SoloTeacher" / "MultiTeacher") so the
        /// client can decide whether to show the teacher or the subject.</summary>
        public string? CenterType { get; set; }

        // Schedule and per-session price are derived from the group's real
        // Session rows (they are not stored on the Group entity).
        public decimal PerSessionPrice { get; set; }
        public List<GroupScheduleItem> Schedule { get; set; } = new();
    }

    public class GroupScheduleItem
    {
        public int DayOfWeek { get; set; }
        public string StartTime { get; set; } = default!;
        public string EndTime { get; set; } = default!;
    }
}
