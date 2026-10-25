namespace CenterManagement.Core.Features.Groups.Commands.Models
{
    public class CreateGroupCommand : IRequest<Response<string>>
    {
        public string Name { get; set; } = default!;
        public decimal MonthlyPrice { get; set; }
        public decimal PerSessionPrice { get; set; }
        public Guid? TeacherId { get; set; }
        public int SessionsPerMonth { get; set; } = 8;
        public List<GroupScheduleSlot> Schedule { get; set; } = new();
    }

    public class GroupScheduleSlot
    {
        public int DayIndex { get; set; } // 0=Saturday..6=Friday
        public string StartTime { get; set; } = default!; // HH:mm
        public string EndTime { get; set; } = default!; // HH:mm
    }
}