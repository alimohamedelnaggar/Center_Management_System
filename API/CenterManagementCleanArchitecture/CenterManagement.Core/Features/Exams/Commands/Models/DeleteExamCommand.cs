

namespace CenterManagement.Core.Features.Exams.Commands.Models;

public sealed record DeleteExamCommand(Guid Id) : IRequest<Response<string>>;
