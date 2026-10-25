using CenterManagement.Core.Features.UsersFeature.Students.Services;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Core.Features.UsersFeature.Students.Services;

public class StudentCreationService : IStudentCreationService
{
    private readonly IRepositoryManager _repositoryManager;

    public StudentCreationService(IRepositoryManager repositoryManager)
    {
        _repositoryManager = repositoryManager;
    }

    public async Task<string> GenerateUniqueQrCodeAsync(CancellationToken cancellationToken = default)
    {
        for (var attempt = 0; attempt < 12; attempt++)
        {
            var code = StudentQrCodeGenerator.Generate();
            var alreadyUsed = await _repositoryManager.StudentRepository
                .GetTableNoTracking()
                .AnyAsync(x => x.QrCode == code, cancellationToken);
            if (!alreadyUsed)
                return code;
        }
        throw new InvalidOperationException("تعذر توليد كود QR فريد، حاول مرة أخرى");
    }

    /// <summary>
    /// Reserved hook for a per-center student cap (not implemented yet). Manual
    /// add and the Excel import both call this before writing anything, so a
    /// future limit has one place to live.
    /// </summary>
    public Task<StudentAdditionCheck> EnsureCanAddStudents(
        Guid centerId,
        int newCount,
        CancellationToken cancellationToken = default)
    {
        _ = centerId;
        _ = newCount;
        _ = cancellationToken;

        return Task.FromResult(StudentAdditionCheck.Allow);
    }

    public async Task<Student> CreateStudentAsync(CreateStudentInput input, CancellationToken cancellationToken = default)
    {
        var fullName = input.FullName.Trim();
        var student = new Student
        {
            FullName = fullName,
            PhoneNumber = input.PhoneNumber,
            ParentPhoneNumber = input.ParentPhoneNumber,
            SubscriptionType = input.SubscriptionType,
            CustomMonthlyPrice = input.CustomMonthlyPrice,
            CenterId = input.CenterId,
            StudentGroups = new List<StudentGroup>
            {
                new StudentGroup
                {
                    GroupId = input.GroupId,
                    JoinDate = DateTime.UtcNow,
                    IsActive = true,
                    LeftAt = null
                }
            }
        };
        student.QrCode = await GenerateUniqueQrCodeAsync(cancellationToken);
        await _repositoryManager.StudentRepository.AddAsync(student);
        await _repositoryManager.SaveChangesAsync();
        return student;
    }
}
