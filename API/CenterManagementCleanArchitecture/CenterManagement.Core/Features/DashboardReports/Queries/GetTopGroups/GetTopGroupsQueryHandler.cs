using CenterManagement.Core.Features.DashboardReports.Queries.GetTopGroups;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

public class GetTopGroupsQueryHandler : ResponseHandler,
    IRequestHandler<GetTopGroupsQuery, Response<List<TopGroupDto>>>
{
    private readonly IRepositoryManager repositoryManager;

    public GetTopGroupsQueryHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        this.repositoryManager = repositoryManager;
    }

    public async Task<Response<List<TopGroupDto>>> Handle(
        GetTopGroupsQuery request,
        CancellationToken cancellationToken)
    {
        var result = await repositoryManager.ReportRepository
            .GetTopGroupsAsync(5, cancellationToken);

        var dto = result
            .Select((x, index) => new TopGroupDto
            {
                Rank = index + 1,
                GroupName = x.GroupName,
                StudentsCount = x.StudentsCount,
                AttendanceRate = Math.Round(x.AttendanceRate, 2)
            })
            .ToList();

        return Success(dto);
    }
}