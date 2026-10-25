using CenterManagement.Core.Features.DashboardReports.Responses;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.DashboardReports.Queries.GetStudentMovement;

public class GetStudentMovementQueryHandler
    : ResponseHandler,
      IRequestHandler<GetStudentMovementQuery, Response<List<StudentMovementDto>>>
{
    private readonly IRepositoryManager repositoryManager;

    public GetStudentMovementQueryHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        this.repositoryManager = repositoryManager;
    }

    public async Task<Response<List<StudentMovementDto>>> Handle(
        GetStudentMovementQuery request,
        CancellationToken cancellationToken)
    {
        var result = await repositoryManager.ReportRepository
            .GetStudentMovementAsync(request.Year, cancellationToken);

        var months = new[]
        {
            "يناير",
            "فبراير",
            "مارس",
            "أبريل",
            "مايو",
            "يونيو",
            "يوليو",
            "أغسطس",
            "سبتمبر",
            "أكتوبر",
            "نوفمبر",
            "ديسمبر"
        };

        var dto = result.Select(x => new StudentMovementDto
        {
            Month = x.Month,
            MonthName = months[x.Month - 1],
            NewStudents = x.NewStudents,
            DepartedStudents = x.DepartedStudents,
            NetGrowth = x.NewStudents - x.DepartedStudents
        }).ToList();

        return Success(dto);
    }
}