using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace CenterManagement.Core.Hubs;

/// <summary>
/// Live attendance updates.
///
/// Every connection joins the group of its own center, so an attendance event
/// of one center is never delivered to the clients of another center - the
/// payload carries student names and phone numbers.
/// </summary>
[Authorize]
public class StudentAttandanceHub : Hub
{
    private readonly AppDbContext _context;
    private readonly ILogger<StudentAttandanceHub> _logger;

    public StudentAttandanceHub(AppDbContext context, ILogger<StudentAttandanceHub> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>Name of the SignalR group that holds the connections of a center.</summary>
    public static string CenterGroup(Guid centerId) => $"center:{centerId}";

    public override async Task OnConnectedAsync()
    {
        var centerId = await ResolveCenterIdAsync();

        if (centerId.HasValue)
        {
            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                CenterGroup(centerId.Value));

            _logger.LogInformation(
                "Attendance hub: connection {ConnectionId} joined {Group}.",
                Context.ConnectionId,
                CenterGroup(centerId.Value));
        }
        else
        {
            _logger.LogWarning(
                "Attendance hub: connection {ConnectionId} has no center, it receives no live attendance.",
                Context.ConnectionId);
        }

        await base.OnConnectedAsync();
    }

    private async Task<Guid?> ResolveCenterIdAsync()
    {
        // Tokens issued by the refresh flow carry the tenant claim; the token
        // issued right after sign-in does not, so we fall back to the database.
        var claim = Context.User?.FindFirst(TenantClaimTypes.CenterId)?.Value;

        if (Guid.TryParse(claim, out var centerId))
            return centerId;

        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userId, out var id))
            return null;

        return await _context.Users
            .Where(u => u.Id == id)
            .Select(u => u.CenterId)
            .FirstOrDefaultAsync();
    }
}
