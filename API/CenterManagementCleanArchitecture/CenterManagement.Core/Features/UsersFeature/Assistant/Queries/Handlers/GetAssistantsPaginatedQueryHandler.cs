using CenterManagement.Infrustructure.InfrastructureBases.Bases;

public sealed class GetAssistantsPaginatedQueryHandler
    : ResponseHandler,
      IRequestHandler<GetAssistantsPaginatedQuery, Response<PaginatedResult<AssistantDto>>>
{
    private readonly IRepositoryManager _repositoryManager;

    public GetAssistantsPaginatedQueryHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _repositoryManager = repositoryManager;
    }

    public async Task<Response<PaginatedResult<AssistantDto>>> Handle(
        GetAssistantsPaginatedQuery request,
        CancellationToken cancellationToken)
    {
        var query = await _repositoryManager.AssistantRepository
            .GetAssistantsQueryableAsync();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            query = query.Where(x =>
                x.FullName.Contains(search) ||
                x.PhoneNumber.Contains(search));
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == request.IsActive);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(x => x.FullName)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new AssistantDto
            {
                Id = x.Id,
                FullName = x.FullName,
                PhoneNumber = x.PhoneNumber,
                Salary = x.Salary,
                WorkingHoursPerWeek = x.WorkingHoursPerWeek,
                HireDate = x.HireDate,
                NationalId = x.NationalId,
                Address = x.Address,
                Notes = x.Notes,
                TeacherId = x.TeacherId,
                TeacherName = x.Teacher != null ? x.Teacher.FullName : null,
                IsActive = x.IsActive 
            })
            .ToListAsync(cancellationToken);

        var result =  PaginatedResult<AssistantDto>.Success(
            items,
            totalCount,
            request.PageNumber,
            request.PageSize);

        return Success(result);
    }
}