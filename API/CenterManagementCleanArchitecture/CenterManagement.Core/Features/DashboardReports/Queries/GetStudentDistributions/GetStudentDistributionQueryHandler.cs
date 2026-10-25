using CenterManagement.Core.Features.DashboardReports.Queries.GetStudentDistributions;
using CenterManagement.Core.Features.DashboardReports.Responses;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

public class GetStudentDistributionQueryHandler : ResponseHandler,
    IRequestHandler<GetStudentDistributionQuery, Response<List<StudentDistributionDto>>>
{
    private readonly IRepositoryManager repositoryManager;

    public GetStudentDistributionQueryHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        this.repositoryManager = repositoryManager;
    }

    public async Task<Response<List<StudentDistributionDto>>> Handle(
        GetStudentDistributionQuery request,
        CancellationToken cancellationToken)
    {
        var result = await repositoryManager.ReportRepository
    .GetStudentDistributionAsync(cancellationToken);

        return Success(result.Select(x => new StudentDistributionDto
        {
            GroupName = x.GroupName,
            StudentsCount = x.StudentsCount
        }).ToList());
    }
}