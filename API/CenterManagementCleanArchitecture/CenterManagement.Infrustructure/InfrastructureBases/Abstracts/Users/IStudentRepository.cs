using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Infrustructure.InfrastructureBases.Abstracts;

public interface IStudentRepository : IGenericRepository<Student>
{
    Task<Student?> GetByPhoneAsync(string phone);
    Task<Student?> GetByParentPhoneAsync(string parentPhone);

    IQueryable<Student> GetStudentsFinanceQuery();

    Task<Student?> GetDetailsAsync(Guid studentId);

    Task<Student?> GetByIdWithGroupAsync(Guid studentId);

    Task<int> GetTotalStudentsAsync();

    Task<int> GetActiveStudentsAsync();

    Task<int> GetInactiveStudentsAsync();

    Task<int> GetNewStudentsThisMonthAsync();

    Task<StudentStatsResult> GetStudentStatsAsync();

    Task<Student?> GetByFullNameAndGroupAsync(
    string fullName,
    Guid groupId,
    Guid? excludedStudentId = null);



}
