using CenterManagement.Core.Bases;
using CenterManagement.Data.Enums;
using MediatR;

namespace CenterManagement.Core.Features.Centers.Commands.Models;

/// <summary>
/// SuperAdmin edits a center's details and (re)configures its subscription in a
/// single call. Leaving <see cref="SubscriptionEnd"/> in the future while the
/// center was Expired reactivates it.
/// </summary>
public class UpdateCenterCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }

    public string Name { get; set; } = default!;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }

    public CenterType? Type { get; set; }

    // ---- Subscription ----
    public string? Plan { get; set; }
    public DateTime? SubscriptionStart { get; set; }
    public DateTime? SubscriptionEnd { get; set; }
}
