using CenterManagement.Core.Features.QuestionBankFeature.Dtos;

namespace CenterManagement.Core.Features.QuestionBankFeature.Queries.Models;

public class GetQuestionBanksPaginatedQuery : IRequest<Response<PaginatedResult<QuestionBankDTO>>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Search { get; set; }
    public Guid? AcademicYearId { get; set; }
}

public class GetQuestionBankQuestionsQuery : IRequest<Response<List<QuestionDTO>>>
{
    public Guid BankId { get; set; }
}