using CenterManagement.Application.Features.Sessions.Commands.EditSession;
using CenterManagement.Core.Features.Sessions.Commands.AddSessions;
using CenterManagement.Core.Features.Sessions.Commands.DeleteSessions;
using CenterManagement.Core.Features.Sessions.Queries.GetSessionById;
using CenterManagement.Core.Features.Sessions.Queries.GetSessionsByGroup;

namespace CenterManagement.Api.Controllers
{

    [Authorize(Policy = AppPolicies.Operational)]
    [CoreEndpoint]
    public class SessionController : AppControllerBase
    {
        [HttpPost(Routing.SessionsRoute.Create)]
        public async Task<IActionResult> Add(AddSessionCommand command)
        {
            var result = await _mediator.Send(command);

            return NewResult(result);
        }

        [HttpPut(Routing.SessionsRoute.Edit)]
        public async Task<IActionResult> Edit(EditSessionCommand command)
        {
            var result = await _mediator.Send(command);

            return NewResult(result);
        }

        [HttpDelete(Routing.SessionsRoute.Delete)]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _mediator.Send(new DeleteSessionCommand(id));

            return NewResult(result);
        }

        [HttpGet(Routing.SessionsRoute.GetSessionById)]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _mediator.Send(new GetSessionByIdQuery(id));

            return NewResult(result);
        }

        [HttpGet(Routing.SessionsRoute.GetSessionByGroup)]
        public async Task<IActionResult> GetByGroup(Guid groupId)
        {
            var result = await _mediator.Send(new GetSessionsByGroupQuery(groupId));

            return NewResult(result);
        }
    }
}
