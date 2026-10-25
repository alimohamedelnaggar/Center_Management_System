using CenterManagement.Core.Features.UsersFeature.Assistant.Queries.Models;

public sealed class GetAssistantByIdQueryHandler
    : ResponseHandler,
      IRequestHandler<GetAssistantByIdQuery, Response<AssistantDto>>
{
    private readonly UserManager<User> _userManager;
    private readonly ITenantContext _tenantContext;

    public GetAssistantByIdQueryHandler(
        UserManager<User> userManager,
        ITenantContext tenantContext,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _userManager = userManager;
        _tenantContext = tenantContext;
    }

    public async Task<Response<AssistantDto>> Handle(
        GetAssistantByIdQuery request,
        CancellationToken cancellationToken)
    {
        var query = _userManager.Users
            .OfType<Assistent>()
            .AsNoTracking()
            .Where(x => x.Id == request.Id);

        if (!_tenantContext.IsUnrestricted && _tenantContext.CenterId is Guid centerId)
            query = query.Where(x => x.CenterId == centerId);

        var assistant = await query
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
            .FirstOrDefaultAsync(cancellationToken);

        if (assistant is null)
            return NotFound<AssistantDto>("المساعد غير موجود.");

        return Success(assistant);
    }
}