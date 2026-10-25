
namespace CenterManagement.Core.Features.Auth.ApplicationUser.Queries.Handlers;

public class UserQueryHandler : ResponseHandler,
     IRequestHandler<GetUserPaginationQuery, PaginatedResult<GetUserPaginationReponse>>,
     IRequestHandler<GetUserByIdQuery, Response<GetUserByIdResponse>>
{
    #region Fields
    private readonly IStringLocalizer<SharedResources> _sharedResources;
    private readonly UserManager<User> _userManager;
    #endregion

    #region Constructors
    public UserQueryHandler(IStringLocalizer<SharedResources> stringLocalizer,
                              UserManager<User> userManager) : base(stringLocalizer)
    {
        _sharedResources = stringLocalizer;
        _userManager = userManager;
    }
    #endregion

    #region Handle Functions
    public async Task<PaginatedResult<GetUserPaginationReponse>> Handle(GetUserPaginationQuery request, CancellationToken cancellationToken)
    {
        //var users = _userManager.Users.AsQueryable();
        //var paginatedList = await _mapper.ProjectTo<GetUserPaginationReponse>(users)
        //                                .ToPaginatedListAsync(request.PageNumber, request.PageSize);
        //return paginatedList;
        return null;
    }

    public async Task<Response<GetUserByIdResponse>> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
    {
        ////var user = await _userManager.Users.FirstOrDefaultAsync(x => x.Id==request.Id);
        //var user = await _userManager.FindByIdAsync(request.Id.ToString());
        //if (user == null) return NotFound<GetUserByIdResponse>(_sharedResources[SharedResourcesKeys.NotFound]);
        //var result = _mapper.Map<GetUserByIdResponse>(user);
        //return Success(result);
        return null;

    }
    #endregion
}
