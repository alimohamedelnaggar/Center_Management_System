

namespace CenterManagement.Core.Features.Reports.Responses
{
    public class StudentGroupHistoryDto
    {
        public Guid GroupId { get; set; }
        public string GroupName { get; set; } = default!;
        public DateTime JoinDate { get; set; }
        public DateTime? LeftAt { get; set; }
        public bool IsActive { get; set; }
    }
}
