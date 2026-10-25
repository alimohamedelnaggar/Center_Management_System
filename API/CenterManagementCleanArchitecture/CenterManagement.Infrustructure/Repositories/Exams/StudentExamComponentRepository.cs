using CenterManagement.Data.Entities.Exams;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Exams;

namespace CenterManagement.Infrustructure.Repositories.Exams;

public class StudentExamComponentRepository : GenericRepository<StudentExamComponent>, IStudentExamComponentRepository
{
    #region Fields
    private readonly AppDbContext dbContext;
    #endregion

    #region Constructors
    public StudentExamComponentRepository(AppDbContext dbContext) : base(dbContext)
    {
        this.dbContext = dbContext;
    }
    #endregion

    #region Handle Functions

    #endregion
}
