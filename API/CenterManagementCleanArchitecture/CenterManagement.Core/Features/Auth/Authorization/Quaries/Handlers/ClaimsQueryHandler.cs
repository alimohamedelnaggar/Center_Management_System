
namespace CenterManagement.Core.Features.Auth.Authorization.Quaries.Handlers;

public class ClaimsQueryHandler : ResponseHandler,
    IRequestHandler<ManageUserClaimsQuery, Response<ManageUserClaimsResult>>
{
    #region Fileds
    private readonly UserManager<User> _userManager;
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    #endregion
    #region Constructors
    public ClaimsQueryHandler(IStringLocalizer<SharedResources> stringLocalizer,
                              UserManager<User> userManager) : base(stringLocalizer)
    {
        _userManager = userManager;
        _stringLocalizer = stringLocalizer;
    }
    #endregion
    #region Handle Functions
    public async Task<Response<ManageUserClaimsResult>> Handle(ManageUserClaimsQuery request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(request.UserId.ToString());
        if (user == null) return NotFound<ManageUserClaimsResult>(_stringLocalizer[SharedResourcesKeys.UserIsNotFound]);
        var result = await ManageUserClaimData(user);
        return Success(result);
    }
    public async Task<ManageUserClaimsResult> ManageUserClaimData(User user)
    {
        var response = new ManageUserClaimsResult();
        var usercliamsList = new List<UserClaims>();
        response.UserId = user.Id;
        //Get USer Claims
        var userClaims = await _userManager.GetClaimsAsync(user); //edit
                                                                  //create edit get print
        foreach (var claim in ClaimsStore.claims)
        {
            var userclaim = new UserClaims();
            userclaim.Type = claim.Type;
            if (userClaims.Any(x => x.Type == claim.Type))
            {
                userclaim.Value = true;
            }
            else
            {
                userclaim.Value = false;
            }
            usercliamsList.Add(userclaim);
        }
        response.userClaims = usercliamsList;
        //return Result
        return response;
    }

    #endregion
}
