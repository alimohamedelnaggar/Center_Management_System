namespace CenterManagement.Core.Features.Auth.Authorization.Commands.Handlers;

public class ClaimsCommandHandler : ResponseHandler,
     IRequestHandler<UpdateUserClaimsCommand, Response<string>>
{
    #region Fileds
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly UserManager<User> _userManager;
    private readonly AppDbContext _dbContext;

    #endregion
    #region Constructors
    public ClaimsCommandHandler(IStringLocalizer<SharedResources> stringLocalizer, AppDbContext dbContext,
        UserManager<User> userManager) : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _dbContext = dbContext;
        _userManager = userManager;
    }
    #endregion
    #region Handle Functions
    public async Task<Response<string>> Handle(UpdateUserClaimsCommand request, CancellationToken cancellationToken)
    {
        var result = await UpdateUserClaims(request);
        switch (result)
        {
            case "UserIsNull": return NotFound<string>(_stringLocalizer[SharedResourcesKeys.UserIsNotFound]);
            case "FailedToRemoveOldClaims": return BadRequest<string>(_stringLocalizer[SharedResourcesKeys.FailedToRemoveOldClaims]);
            case "FailedToAddNewClaims": return BadRequest<string>(_stringLocalizer[SharedResourcesKeys.FailedToAddNewClaims]);
            case "FailedToUpdateClaims": return BadRequest<string>(_stringLocalizer[SharedResourcesKeys.FailedToUpdateClaims]);
        }
        return Success<string>(_stringLocalizer[SharedResourcesKeys.Success]);
    }
    public async Task<string> UpdateUserClaims(UpdateUserClaimsRequest request)
    {
        var transact = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            var user = await _userManager.FindByIdAsync(request.UserId.ToString());
            if (user == null)
            {
                return "UserIsNull";
            }
            //remove old Claims
            var userClaims = await _userManager.GetClaimsAsync(user);
            var removeClaimsResult = await _userManager.RemoveClaimsAsync(user, userClaims);
            if (!removeClaimsResult.Succeeded)
                return "FailedToRemoveOldClaims";
            var claims = request.userClaims.Where(x => x.Value == true).Select(x => new System.Security.Claims.Claim(x.Type, x.Value.ToString()));

            var addUserClaimResult = await _userManager.AddClaimsAsync(user, claims);
            if (!addUserClaimResult.Succeeded)
                return "FailedToAddNewClaims";

            await transact.CommitAsync();
            return "Success";
        }
        catch (Exception ex)
        {
            await transact.RollbackAsync();
            return "FailedToUpdateClaims";
        }
    }
    #endregion
}
