using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Students.Commands.Validators;

public class EditStudentValidator : AbstractValidator<EditStudentCommand>
{
    private readonly IRepositoryManager _repositoryManager;

    public EditStudentValidator(IRepositoryManager repositoryManager)
    {
        _repositoryManager = repositoryManager;

        RuleFor(x => x.Id)
            .NotEmpty()
            .WithMessage("معرف الطالب مطلوب");

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
            command.Id,
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
        //.MustAsync(async (command, phone, cancellationToken) =>
        //    await StudentPhoneNotExists(command.Id, phone, cancellationToken))
        //.WithMessage("رقم هاتف الطالب مستخدم بالفعل");

        RuleFor(x => x.PhoneParent)
            .NotEmpty()
            .WithMessage("رقم هاتف ولي الأمر مطلوب")
            .Matches(@"^01[0-2,5]\d{8}$")
            .WithMessage("رقم هاتف ولي الأمر غير صحيح");
        //.MustAsync(async (command, phone, cancellationToken) =>
        //    await ParentPhoneNotExists(command.Id, phone, cancellationToken))
        //.WithMessage("رقم هاتف ولي الأمر مستخدم بالفعل");

        RuleFor(x => x.GroupId)
            .NotEmpty()
            .WithMessage("يجب اختيار الجروب")
            .MustAsync(GroupExists)
            .WithMessage("الجروب غير موجود");
    }

    private async Task<bool> IsStudentExists(Guid id, CancellationToken cancellationToken)
    {
        return await _repositoryManager.StudentRepository.GetByIdAsync(id) is not null;
    }
    private async Task<bool> GroupExists(Guid groupId, CancellationToken cancellationToken)
    {
        return await _repositoryManager.GroupRepository.GetByIdAsync(groupId) is not null;
    }

    private async Task<bool> StudentPhoneNotExists(Guid studentId, string phone, CancellationToken cancellationToken)
    {
        var student = await _repositoryManager.StudentRepository.GetByPhoneAsync(phone);

        return student is null || student.Id == studentId;
    }

    private async Task<bool> ParentPhoneNotExists(Guid studentId, string phone, CancellationToken cancellationToken)
    {
        var student = await _repositoryManager.StudentRepository.GetByParentPhoneAsync(phone);

        return student is null || student.Id == studentId;
    }
    private async Task<bool> StudentNameNotExists(
     Guid studentId,
     string fullName,
     Guid groupId,
     CancellationToken cancellationToken)
    {
        var student = await _repositoryManager.StudentRepository
            .GetByFullNameAndGroupAsync(
                fullName,
                groupId,
                studentId);

        return student is null;
    }
}