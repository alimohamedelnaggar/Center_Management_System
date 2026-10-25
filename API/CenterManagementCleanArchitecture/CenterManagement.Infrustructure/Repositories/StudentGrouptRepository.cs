

using CenterManagement.Infrustructure.InfrastructureBases.Abstracts;

namespace CenterManagement.Infrustructure.Repositories;

public class StudentGrouptRepository : GenericRepository<StudentGroup>, IStudentGroupRepository
{
    #region Fields
    private readonly AppDbContext dbContext;
    #endregion

    #region Constructors
    public StudentGrouptRepository(AppDbContext dbContext) : base(dbContext)
    {
        this.dbContext = dbContext;
    }
    #endregion

    #region Handle Functions

    #endregion
}
