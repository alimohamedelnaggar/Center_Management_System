using CenterManagement.Core.Features.UsersFeature.Students.Queries.Results;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.UsersFeature.Students.Queries.Handlers;

public class GetStudentsPaginatedQueryHandler
    : ResponseHandler,
      IRequestHandler<GetStudentsPaginatedQuery, Response<PagedResult<StudentPagedDTO>>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;
    private readonly ICenterModuleService _centerModules;
    private readonly ITenantContext _tenantContext;

    public GetStudentsPaginatedQueryHandler(IRepositoryManager repositoryManager,
         IUserScopeService scopeService,
         ICenterModuleService centerModules,
         ITenantContext tenantContext,
         IStringLocalizer<SharedResources> stringLocalizer) : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
        _centerModules = centerModules;
        _tenantContext = tenantContext;
    }

    public async Task<Response<PagedResult<StudentPagedDTO>>> Handle(GetStudentsPaginatedQuery request, CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        var query = _repositoryManager
            .StudentRepository
            .GetTableNoTracking()
            .ScopeToUser(scope);

        // Search
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();
            query = query.Where(x =>
                x.FullName.Contains(search) ||
                x.PhoneNumber.Contains(search) ||
                x.ParentPhoneNumber.Contains(search));
        }

        // Filter By Group
        if (request.GroupId.HasValue)
        {
            query = query.Where(s => s.StudentGroups.Any(sg => sg.GroupId == request.GroupId.Value && sg.IsActive && sg.LeftAt == null));
        }

        // Filter By Status
        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == request.IsActive);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var students = await query
            .OrderByDescending(x => x.IsActive)
            .ThenBy(x => x.FullName)
            .Skip((request.PageIndex - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new
            {
                Student = x,
                ActiveGroup = x.StudentGroups
                    .Where(sg => sg.IsActive && sg.LeftAt == null)
                    .OrderByDescending(sg => sg.JoinDate)
                    .Select(sg => sg.Group)
                    .FirstOrDefault()
            })
            .Select(x => new StudentPagedDTO
            {
                Id = x.Student.Id,
                FullName = x.Student.FullName,
                Phone = x.Student.PhoneNumber,
                PhoneParent = x.Student.ParentPhoneNumber,
                GroupId = x.ActiveGroup != null ? x.ActiveGroup.Id : Guid.Empty,
                GroupName = x.ActiveGroup != null ? x.ActiveGroup.Name : string.Empty,
                IsActive = x.Student.IsActive,
                CreatedAt = x.Student.CreatedAt,
                IsPaid = x.Student.IsPaid,
                SubscriptionType = x.Student.SubscriptionType,
                CustomMonthlyPrice = x.Student.CustomMonthlyPrice,
                QrCode = x.Student.QrCode,
                School = x.Student.School,
            })
            .ToListAsync(cancellationToken);

        var result = new PagedResult<StudentPagedDTO>
        {
            Items = students,
            PageIndex = request.PageIndex,
            PageSize = request.PageSize,
            TotalCount = totalCount
        };

        // Hide fields that belong to a module the center has not enabled, so the
        // student list never leaks payment/attendance data (UI alone is not enough).
        var centerId = _tenantContext.CenterId;

        if (centerId.HasValue)
        {
            var paymentsEnabled = await _centerModules.IsEnabledAsync(centerId.Value, ModuleKeys.Payments, cancellationToken);
            var attendanceEnabled = await _centerModules.IsEnabledAsync(centerId.Value, ModuleKeys.Attendance, cancellationToken);

            if (!paymentsEnabled || !attendanceEnabled)
            {
                foreach (var student in students)
                {
                    if (!paymentsEnabled)
                    {
                        student.IsPaid = null;
                        student.SubscriptionType = null;
                        student.CustomMonthlyPrice = null;
                    }

                    if (!attendanceEnabled)
                        student.QrCode = null;
                }
            }
        }

        return Success(result);
    }
}