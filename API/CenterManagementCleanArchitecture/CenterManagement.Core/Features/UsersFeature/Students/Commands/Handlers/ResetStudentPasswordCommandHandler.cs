using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Handlers;

/// <summary>
/// Resets a student's login password. Center admins may reset any student in
/// their center; a teacher/assistant only a student inside their group scope.
/// The account is forced to change the password at next sign-in and every
/// outstanding refresh token is revoked.
/// </summary>
public class ResetStudentPasswordCommandHandler
    : ResponseHandler,
      IRequestHandler<ResetStudentPasswordCommand, Response<StudentAccountCredential>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly UserManager<User> _userManager;
    private readonly IUserScopeService _scope;
    private readonly IAuditLogService _auditLog;

    public ResetStudentPasswordCommandHandler(
        IRepositoryManager repositoryManager,
        UserManager<User> userManager,
        IUserScopeService scope,
        IAuditLogService auditLog,
        IStringLocalizer<SharedResources> localizer) : base(localizer)
    {
        _repositoryManager = repositoryManager;
        _userManager = userManager;
        _scope = scope;
        _auditLog = auditLog;
    }

    public async Task<Response<StudentAccountCredential>> Handle(
        ResetStudentPasswordCommand request,
        CancellationToken cancellationToken)
    {
        var student = await _repositoryManager.StudentRepository
            .GetByIdAsync(request.StudentId);

        // Not found and out-of-scope are deliberately indistinguishable so a
        // scoped teacher cannot probe for students in other groups.
        if (student is null || !await _scope.AllowsStudentAsync(request.StudentId, cancellationToken))
            return NotFound<StudentAccountCredential>("الطالب غير موجود");

        if (student.UserId is not Guid userId)
            return BadRequest<StudentAccountCredential>("هذا الطالب ليس لديه حساب دخول بعد");

        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
            return BadRequest<StudentAccountCredential>("حساب الطالب غير موجود");

        var temporaryPassword = user.PhoneNumber?.Trim();

        if (string.IsNullOrWhiteSpace(temporaryPassword))
            return BadRequest<StudentAccountCredential>("لا يوجد رقم هاتف صالح لإعادة تعيين كلمة المرور");

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var resetResult = await _userManager.ResetPasswordAsync(user, token, temporaryPassword);

        if (!resetResult.Succeeded)
        {
            return BadRequest<StudentAccountCredential>(
                string.Join(Environment.NewLine,
                    resetResult.Errors.Select(e => e.Description)));
        }

        user.MustChangePassword = true;
        await _userManager.UpdateAsync(user);

        // Revoke every outstanding refresh token so old sessions can no longer
        // mint access tokens after the reset.
        var activeTokens = await _repositoryManager.RefreshTokenRepository
            .GetTableTracking()
            .Where(t => t.UserId == user.Id && !t.IsRevoked)
            .ToListAsync(cancellationToken);

        if (activeTokens.Count > 0)
        {
            var now = DateTime.UtcNow;
            foreach (var refreshToken in activeTokens)
            {
                refreshToken.IsRevoked = true;
                refreshToken.RevokedAt = now;
            }

            await _repositoryManager.SaveChangesAsync();
        }

        await _auditLog.WriteAsync(
            action: "ResetStudentPassword",
            entityType: "Student",
            entityId: student.Id.ToString(),
            details: $"Reset password for student {student.FullName} ({user.PhoneNumber})",
            cancellationToken: cancellationToken);

        return Success(new StudentAccountCredential
        {
            StudentId = student.Id,
            StudentName = student.FullName,
            Username = user.PhoneNumber ?? user.UserName ?? string.Empty,
            TemporaryPassword = temporaryPassword
        }, "تم إعادة تعيين كلمة المرور إلى رقم الهاتف، وسيُطلب تغييرها عند الدخول");
    }
}
