namespace CenterManagement.Core.Features.UsersFeature.Assistant.Queries.Models
{
    // سجل مرتبات مساعد واحد (كل الأشهر)
    // لا يتم تمرير شهر — يتم إرجاع كل عمليات الصرف الخاصة بالمساعد
    public class GetAssistantSalaryInfoQuery
    : IRequest<Response<AssistantSalaryInfoDto>>
    {
        public Guid AssistantId { get; set; }
    }
}
