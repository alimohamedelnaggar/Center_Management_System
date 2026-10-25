using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.UsersFeature.Assistant.Queries.Models
{
    public class GetAssistantByIdQuery : IRequest<Response<AssistantDto>>
    {
        public Guid Id { get; set; }
    }
}
