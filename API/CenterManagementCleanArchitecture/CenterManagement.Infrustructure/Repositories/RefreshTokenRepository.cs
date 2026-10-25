

using CenterManagement.Infrustructure.InfrastructureBases.Abstracts;

namespace CenterManagement.Infrustructure.Repositories;

public class RefreshTokenRepository : GenericRepository<UserRefreshToken>,
    IRefreshTokenRepository
{
    #region Fields
    private DbSet<UserRefreshToken> userRefreshToken;
    #endregion

    #region Constructors
    public RefreshTokenRepository(AppDbContext dbContext) : base(dbContext)
    {
        userRefreshToken = dbContext.Set<UserRefreshToken>();
    }
    #endregion

    #region Handle Functions

    #endregion
}
