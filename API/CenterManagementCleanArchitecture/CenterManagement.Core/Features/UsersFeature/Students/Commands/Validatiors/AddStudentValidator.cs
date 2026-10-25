using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Students.Commands.Validators;

public class AddStudentValidator : AbstractValidator<AddStudentCommand>
{
    private readonly IRepositoryManager _repositoryManager;

    public AddStudentValidator(IRepositoryManager repositoryManager)
    {
        _repositoryManager = repositoryManager;

        RuleFor(x => x.FullName)
    .NotEmpty()
    .WithMessage("الاسم مطلوب")
    .MaximumLength(150)
    .WithMessage("الاسم يجب ألا يزيد عن 150 حرف")
    .MustAsync(async (command, fullName, cancellationToken) =>
    {
        if (command.GroupId == Guid.Empty)
            return true;

        return await StudentNameNotExists(
            fullName,
            command.GroupId,
            cancellationToken);
    })
    .WithMessage("اسم الطالب موجود بالفعل في نفس الجروب");

        RuleFor(x => x.Phone)
            .NotEmpty()
            .WithMessage("رقم هاتف الطالب مطلوب")
            .Matches(@"^01[0-2,5]\d{8}$")
            .WithMessage("رقم هاتف الطالب غير صحيح");
        //.MustAsync(StudentPhoneNotExists)
        //.WithMessage("رقم هاتف الطالب مستخدم بالفعل");

        RuleFor(x => x.PhoneParent)
            .NotEmpty()
            .WithMessage("رقم هاتف ولي الأمر مطلوب")
            .Matches(@"^01[0-2,5]\d{8}$")
            .WithMessage("رقم هاتف ولي الأمر غير صحيح");
        //.MustAsync(ParentPhoneNotExists)
        //.WithMessage("رقم هاتف ولي الأمر مستخدم بالفعل");

        RuleFor(x => x.GroupId)
            .NotEmpty()
            .WithMessage("يجب اختيار الجروب")
            .MustAsync(GroupExists)
            .WithMessage("الجروب غير موجود");
    }

    private async Task<bool> GroupExists(Guid groupId, CancellationToken cancellationToken)
    {
        return await _repositoryManager.GroupRepository.GetByIdAsync(groupId) is not null;
    }

    private async Task<bool> StudentPhoneNotExists(string phone, CancellationToken cancellationToken)
    {
        var student = await _repositoryManager.StudentRepository.GetByPhoneAsync(phone);
        return student is null;
    }

    private async Task<bool> ParentPhoneNotExists(string phone, CancellationToken cancellationToken)
    {
        var student = await _repositoryManager.StudentRepository.GetByParentPhoneAsync(phone);
        return student is null;
    }

    private async Task<bool> StudentNameNotExists(
    string fullName,
    Guid groupId,
    CancellationToken cancellationToken)
    {
        var student = await _repositoryManager.StudentRepository
            .GetByFullNameAndGroupAsync(fullName, groupId);

        return student is null;
    }
}