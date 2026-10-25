using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Core.Features.ParentPortalFeature.Dtos;
using CenterManagement.Core.Features.ParentPortalFeature.Queries.Models;

namespace CenterManagement.Core.Features.ParentPortalFeature.Queries.Handlers;

public class GetMyChildrenQueryHandler : ResponseHandler,
    IRequestHandler<GetMyChildrenQuery, Response<List<ParentChildDTO>>>
{
    private readonly AppDbContext _context;
    private readonly IMediator _mediator;

    public GetMyChildrenQueryHandler(
        AppDbContext context,
        IMediator mediator,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _context = context;
        _mediator = mediator;
    }

    public async Task<Response<List<ParentChildDTO>>> Handle(
        GetMyChildrenQuery request,
        CancellationToken cancellationToken)
    {
        var userId = (await _mediator.Send(new GetUserIdQuery(), cancellationToken)).Data;

        var children = await _context.ParentStudentLinks
            .AsNoTracking()
            .Where(l => l.ParentUserId == userId)
            .OrderBy(l => l.Student!.FullName)
            .Select(l => new ParentChildDTO
            {
                StudentId = l.StudentId,
                FullName = l.Student!.FullName,
                IsActive = l.Student!.IsActive
            })
            .ToListAsync(cancellationToken);

        return Success(children);
    }
}
