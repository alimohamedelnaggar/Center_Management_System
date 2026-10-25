using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Centers.Commands.Models;

/// <summary>
/// Turns the caller's solo-teacher center into a multi-teacher center so
/// additional teachers can be added. A SuperAdmin may target a center
/// explicitly through <see cref="CenterId"/>.
/// </summary>
public class UpgradeCenterToMultiTeacherCommand : IRequest<Response<string>>
{
    public Guid? CenterId { get; set; }
}
