using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.DashboardReports.Queries.GetAssistantStatistics;
using CenterManagement.Core.Features.UsersFeature.Assistant.Queries.Models;
using CenterManagement.Infrustructure.Data.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.UsersFeature.Assistant.Queries.Handlers;

public class GetAssistantStatisticsQueryHandler
    : ResponseHandler,
      IRequestHandler<GetAssistantStatisticsQuery, Response<AssistantStatisticsModel>>
{
    private readonly IRepositoryManager _repositoryManager;

    public GetAssistantStatisticsQueryHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _repositoryManager = repositoryManager;
    }

    public async Task<Response<AssistantStatisticsModel>> Handle(
        GetAssistantStatisticsQuery request,
        CancellationToken cancellationToken)
    {
        var statistics = await _repositoryManager
        .AssistantPaymentRepository
        .GetAssistantStatisticsAsync(cancellationToken);

        return Success(statistics);
    }
}