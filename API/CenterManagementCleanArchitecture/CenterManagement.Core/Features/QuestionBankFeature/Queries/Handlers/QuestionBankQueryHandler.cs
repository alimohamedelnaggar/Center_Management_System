using CenterManagement.Core.Features.QuestionBankFeature.Dtos;
using CenterManagement.Core.Features.QuestionBankFeature.Queries.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.Extensions.Localization;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Core.Features.QuestionBankFeature.Queries.Handlers;

public class QuestionBankQueryHandler : ResponseHandler,
    IRequestHandler<GetQuestionBanksPaginatedQuery, Response<PaginatedResult<QuestionBankDTO>>>,
    IRequestHandler<GetQuestionBankQuestionsQuery, Response<List<QuestionDTO>>>
{
    #region Fields
    private readonly IRepositoryManager _repositoryManager;
    #endregion

    #region Constructors
    public QuestionBankQueryHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
    }
    #endregion

    #region Handle Functions

    public async Task<Response<PaginatedResult<QuestionBankDTO>>> Handle(
        GetQuestionBanksPaginatedQuery request,
        CancellationToken cancellationToken)
    {
        var query = _repositoryManager.QuestionBankRepository
            .GetTableNoTracking()
            .AsQueryable();

        if (request.AcademicYearId.HasValue)
            query = query.Where(x =>
                x.AcademicYearId == request.AcademicYearId.Value);

        if (!string.IsNullOrWhiteSpace(request.Search))
            query = query.Where(x =>
                x.Name.Contains(request.Search));

        var totalCount = await query.CountAsync(cancellationToken);

        var banks = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new QuestionBankDTO
            {
                Id = x.Id,
                Name = x.Name,
                AcademicYearId = x.AcademicYearId,
                AcademicYearName = x.AcademicYear.Name,
                QuestionsCount = x.Questions.Count()
            })
            .ToListAsync(cancellationToken);

        var paginatedResult = PaginatedResult<QuestionBankDTO>.Success(
            banks,
            totalCount,
            request.PageNumber,
            request.PageSize);

        return Success(paginatedResult);
    }

    public async Task<Response<List<QuestionDTO>>> Handle(
        GetQuestionBankQuestionsQuery request,
        CancellationToken cancellationToken)
    {
        var questions = await _repositoryManager.QuestionRepository
            .GetTableNoTracking()
            .Include(x => x.Options)
            .Where(x => x.QuestionBankId == request.BankId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        var dtos = questions
            .Select(q => new QuestionDTO
            {
                Id = q.Id,
                QuestionBankId = q.QuestionBankId,
                Type = (int)q.Type,
                TypeName = GetTypeName(q.Type),
                Text = q.Text,
                ImageName = q.ImageName,
                Mark = q.Mark,
                Options = q.Options
                    .OrderBy(o => o.Order)
                    .Select(o => new QuestionOptionDTO
                    {
                        Id = o.Id,
                        Order = o.Order,
                        Text = o.Text,
                        IsCorrect = o.IsCorrect
                    })
                    .ToList()
            })
            .ToList();

        return Success(dtos);
    }

    #endregion

    #region Helpers

    private static string GetTypeName(QuestionType type)
    {
        return type switch
        {
            QuestionType.TrueFalse => "صح وغلط",
            QuestionType.MultipleChoice => "اختيار من متعدد",
            QuestionType.Essay => "مقالي",
            _ => "غير محدد"
        };
    }

    #endregion
}