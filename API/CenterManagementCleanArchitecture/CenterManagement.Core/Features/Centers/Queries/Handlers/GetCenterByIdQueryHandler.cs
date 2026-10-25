using CenterManagement.Core.Features.Centers.Queries.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Infrustructure.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Centers.Queries.Handlers;

public class GetCenterByIdQueryHandler
    : ResponseHandler, IRequestHandler<GetCenterByIdQuery, Response<CenterDetailsDto>>
{
    private readonly AppDbContext _context;

    public GetCenterByIdQueryHandler(
        IStringLocalizer<SharedResources> localizer,
        AppDbContext context) : base(localizer)
    {
        _context = context;
    }

    public async Task<Response<CenterDetailsDto>> Handle(
        GetCenterByIdQuery request,
        CancellationToken cancellationToken)
    {
        var center = await _context.Centers
            .AsNoTracking()
            .Where(c => c.Id == request.Id)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.LogoUrl,
                c.Phone,
                c.Address,
                c.Description,
                c.ThemeColor,
                c.Type,
                c.Status,
                c.IsActive,
                c.OwnerId,
                OwnerName = c.Owner != null ? c.Owner.FullName : null,
                OwnerPhone = c.Owner != null ? c.Owner.PhoneNumber : null,
                OwnerEmail = c.Owner != null ? c.Owner.Email : null,
                c.SubscriptionStart,
                c.SubscriptionEnd,
                c.Plan,
                c.Notes,
                c.CreatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (center is null) return NotFound<CenterDetailsDto>("المركز غير موجود");

        var dto = new CenterDetailsDto
        {
            Id = center.Id,
            Name = center.Name,
            LogoUrl = center.LogoUrl,
            Phone = center.Phone,
            Address = center.Address,
            Description = center.Description,
            ThemeColor = center.ThemeColor,
            Type = center.Type.ToString(),
            Status = center.Status.ToString(),
            IsActive = center.IsActive,
            OwnerId = center.OwnerId,
            OwnerName = center.OwnerName,
            OwnerPhone = center.OwnerPhone,
            OwnerEmail = center.OwnerEmail,
            TeachersCount = await CountUsersAsync(request.Id, AppRoles.Teacher, cancellationToken),
            AssistantsCount = await CountUsersAsync(request.Id, AppRoles.Assistant, cancellationToken),
            StudentsCount = await CountUsersAsync(request.Id, AppRoles.Student, cancellationToken),
            GroupsCount = await _context.Groups.AsNoTracking()
                .CountAsync(group => group.CenterId == request.Id, cancellationToken),
            SubscriptionStart = center.SubscriptionStart,
            SubscriptionEnd = center.SubscriptionEnd,
            Plan = center.Plan,
            Notes = center.Notes,
            CreatedAt = center.CreatedAt
        };

        return Success(dto);
    }

    private async Task<int> CountUsersAsync(Guid centerId, string roleName, CancellationToken cancellationToken)
    {
        return await (
            from user in _context.Users.AsNoTracking()
            join userRole in _context.UserRoles.AsNoTracking() on user.Id equals userRole.UserId
            join role in _context.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where role.Name == roleName && user.CenterId == centerId
            select user.Id)
            .CountAsync(cancellationToken);
    }
}
