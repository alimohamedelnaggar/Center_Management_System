

namespace CenterManagement.Core.Features.Groups.Commands.Models
{
    public class UpdateGroupCommand : IRequest<Response<string>>
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = default!;
        public decimal MonthlyPrice { get; set; }
        public decimal PerSessionPrice { get; set; }
        public Guid? TeacherId { get; set; }
        public int SessionsPerMonth { get; set; } = 8;
        public List<GroupScheduleSlot> Schedule { get; set; } = new();
    }
}
