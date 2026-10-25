using CenterManagement.Api.Base;
using CenterManagement.Core.Features.Audit.Queries.Models;

namespace CenterManagement.Api.Controllers.AuditLogs;

[PlatformEndpoint]
public class AuditLogController : AppControllerBase
{
    [HttpGet(Routing.AuditLogRouting.Paginated)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    public async Task<IActionResult> Paginated([FromQuery] GetAuditLogsQuery query)
    {
        var response = await _mediator.Send(query);
        return NewResult(response);
    }
}
