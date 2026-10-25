using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Core.Features.UsersFeature.Students.Services;

/// <summary>
/// The single implementation of "create the student login account".
/// Shared by the per-student command, the bulk credentials run and the Excel
/// import so all three apply exactly the same rules: username = password =
/// phone, forced password change, refuse a phone owned by another account.
/// </summary>
public interface IStudentAccountService
{
    /// <summary>
    /// Creates the login account of a student when possible. Never throws: a
    /// failure is reported as a human-readable reason.
    /// </summary>
    Task<(StudentAccountCredential? credential, string? reason)> CreateAccountAsync(
        Student student,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the working temporary password (the phone) while the account still
    /// uses it, or null when the student already chose a permanent password.
    /// </summary>
    Task<(string? password, bool passwordChanged)> ResolveCredentialsAsync(
        User user,
        string? rawPhone,
        CancellationToken cancellationToken = default);
}

public sealed class StudentAccountService : IStudentAccountService
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly UserManager<User> _userManager;

    public StudentAccountService(
        IRepositoryManager repositoryManager,
        UserManager<User> userManager)
    {
        _repositoryManager = repositoryManager;
        _userManager = userManager;
    }

    public async Task<(StudentAccountCredential? credential, string? reason)> CreateAccountAsync(
        Student student,
        CancellationToken cancellationToken = default)
    {
        var phone = student.PhoneNumber?.Trim();

        if (string.IsNullOrWhiteSpace(phone))
            return (null, "لا يوجد رقم هاتف مسجّل للطالب");

        if (!IsValidPhone(phone))
            return (null, "رقم هاتف غير صالح");

        try
        {
            var existing = await _userManager.Users
                .FirstOrDefaultAsync(x => x.PhoneNumber == phone, cancellationToken);

            if (existing is not null)
            {
                if (student.UserId == existing.Id)
                    return (null, "الحساب موجود بالفعل");

                return (null, "رقم الهاتف مستخدم بالفعل لحساب آخر");
            }

            var temporaryPassword = phone;

            var user = new User
            {
                Id = Guid.NewGuid(),
                UserName = phone,
                PhoneNumber = phone,
                FullName = student.FullName,
                CenterId = student.CenterId,
                MustChangePassword = true
            };

            var createResult = await _userManager.CreateAsync(user, temporaryPassword);

            if (!createResult.Succeeded)
            {
                return (null, "فشل إنشاء الحساب: " + string.Join(
                    "؛ ", createResult.Errors.Select(e => e.Description)));
            }

            var roleResult = await _userManager.AddToRoleAsync(user, AppRoles.Student);

            if (!roleResult.Succeeded)
            {
                await _userManager.DeleteAsync(user);

                return (null, "فشل إسناد دور الطالب: " + string.Join(
                    "؛ ", roleResult.Errors.Select(e => e.Description)));
            }

            student.UserId = user.Id;

            await _repositoryManager.StudentRepository.UpdateAsync(student);
            await _repositoryManager.SaveChangesAsync();

            return (new StudentAccountCredential
            {
                StudentId = student.Id,
                StudentName = student.FullName,
                Username = phone,
                TemporaryPassword = temporaryPassword
            }, null);
        }
        catch (Exception ex)
        {
            return (null, "خطأ غير متوقع: " + (ex.InnerException?.Message ?? ex.Message));
        }
    }

    public async Task<(string? password, bool passwordChanged)> ResolveCredentialsAsync(
        User user,
        string? rawPhone,
        CancellationToken cancellationToken = default)
    {
        var phone = rawPhone?.Trim();

        if (string.IsNullOrWhiteSpace(phone) || !IsValidPhone(phone))
            return (null, false);

        if (!await _userManager.CheckPasswordAsync(user, phone))
            return (null, true);

        if (!user.MustChangePassword)
        {
            user.MustChangePassword = true;
            await _userManager.UpdateAsync(user);
        }

        return (phone, false);
    }

    /// <summary>Accepts an optional leading '+' followed by 8-15 digits.</summary>
    private static bool IsValidPhone(string phone)
    {
        var digits = phone.StartsWith('+') ? phone[1..] : phone;

        if (digits.Length is < 8 or > 15)
            return false;

        return digits.All(char.IsDigit);
    }
}
