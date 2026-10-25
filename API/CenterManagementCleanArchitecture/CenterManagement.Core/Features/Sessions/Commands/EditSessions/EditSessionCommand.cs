using MediatR;

namespace CenterManagement.Application.Features.Sessions.Commands.EditSession;

public sealed record EditSessionCommand : IRequest<Response<Guid>>
{
    public Guid Id { get; init; }

    public Guid GroupId { get; init; }

    public DayOfWeek DayOfWeek { get; init; }

    public TimeOnly StartTime { get; init; }

    public TimeOnly EndTime { get; init; }

    public decimal SessionPrice { get; init; }
}