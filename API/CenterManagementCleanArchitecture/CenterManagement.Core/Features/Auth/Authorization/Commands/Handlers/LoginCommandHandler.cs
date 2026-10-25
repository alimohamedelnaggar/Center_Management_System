
namespace CenterManagement.Core.Features.Auth.Authorization.Commands.Handlers;

internal class LoginCommandHandler : IRequestHandler<LoginCommand, LoginResponse>
{
    private readonly UserManager<User> _userManager;
    private readonly AppDbContext _dbContext;
    private readonly IConfiguration _configuration;

    public LoginCommandHandler(UserManager<User> userManager, AppDbContext dbContext, IConfiguration configuration)
    {
        _userManager = userManager;
        _dbContext = dbContext;
        _configuration = configuration;
    }
    public async Task<LoginResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        if (user == null)

            return new LoginResponse(false, "Invalid email or password.");

        var isPasswordValid = await _userManager.CheckPasswordAsync(user, request.Password);

        if (!isPasswordValid)
            return new LoginResponse(false, "Invalid email or password.");

        var roles = await _userManager.GetRolesAsync(user);


        // 4. Construct standard security payload claims for the JWT

        var authClaims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email!),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };
        // Inject roles into the token claims collection
        foreach (var role in roles)
        {
            if (role != null)
                authClaims.Add(new Claim(ClaimTypes.Role, role));
        }

        var jwtSetting = _configuration.GetSection("jwtSettings");
        var authSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSetting["Secret"]));
        var expirationTime = DateTime.UtcNow.AddMinutes(double.Parse(jwtSetting["ExpiryInMinutes"] ?? "60"));

        var token = new JwtSecurityToken(
                       issuer: jwtSetting["issuer"],
                       audience: jwtSetting["audiance"],
                       expires: expirationTime,
                       claims: authClaims,
                       signingCredentials:
                        new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256)

                    );


        return new LoginResponse(IsAuthenticated: true,
            Message: "Authentication complete.",
            Token: new JwtSecurityTokenHandler().WriteToken(token),
            Expiration: expirationTime
        );
    }
}
