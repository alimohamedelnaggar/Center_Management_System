namespace CenterManagement.Core.Features.UsersFeature.Assistant.Queries.Models
{
    public class GetAssistantsSalaryStatusQuery
    : IRequest<Response<List<AssistantSalaryStatusDto>>>
    {
        public int Month { get; set; }

        public int Year { get; set; }

        public string? Search { get; set; }

        // all | paid | partial | unpaid
        public string? Status { get; set; }
    }
}
