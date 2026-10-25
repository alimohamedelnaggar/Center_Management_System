namespace CenterManagement.Core.Features.ParentPortalFeature.Services;

/// <summary>
/// The single implementation of "create the parent login account of a student".
/// It is shared by the per-student command and the bulk command so the two
/// flows can never disagree about the rules.
/// </summary>
public sealed class ParentAccountService : IParentAccountService
{
    private readonly AppDbContext _context;
    private readonly UserManager<User> _userManager;

    public ParentAccountService(AppDbContext context, UserManager<User> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<ParentAccountOutcome> EnsureAccountAsync(
        Student student,
        CancellationToken cancellationToken = default)
    {
        var phone = student.ParentPhoneNumber?.Trim();

        if (string.IsNullOrWhiteSpace(phone))
            return ParentAccountOutcome.AccountSkipped(student, null, "لا يوجد رقم هاتف مسجّل لولي الأمر");

        if (!IsValidPhone(phone))
            return ParentAccountOutcome.AccountSkipped(student, phone, "رقم هاتف ولي الأمر غير صالح");

        try
        {
            var parent = await _userManager.Users
                .FirstOrDefaultAsync(u => u.PhoneNumber == phone, cancellationToken);

            string? temporaryPassword = null;
            var passwordChanged = false;
            var isNewAccount = false;

            if (parent is not null)
            {
                // Reuse only a real parent account that belongs to the same center.
                if (!await _userManager.IsInRoleAsync(parent, AppRoles.Parent))
                    return ParentAccountOutcome.AccountSkipped(student, phone, "رقم الهاتف مستخدم بالفعل لحساب آخر");

                if (parent.CenterId != student.CenterId)
                    return ParentAccountOutcome.AccountSkipped(student, phone, "رقم الهاتف مسجّل لولي أمر في مركز آخر");

                // A parent who already picked a permanent password is left alone;
                // the printed sheet then only says that it was changed.
                passwordChanged = !await MarkTemporaryIfPhoneAsync(parent, phone);
            }
            else
            {
                // Username and password are both the parent phone number; the
                // parent must replace it at the first sign-in.
                temporaryPassword = phone;
                isNewAccount = true;

                parent = new User
                {
                    Id = Guid.NewGuid(),
                    UserName = phone,
                    PhoneNumber = phone,
                    FullName = $"ولي أمر {student.FullName}",
                    CenterId = student.CenterId,
                    MustChangePassword = true
                };

                var createResult = await _userManager.CreateAsync(parent, temporaryPassword);

                if (!createResult.Succeeded)
                    return ParentAccountOutcome.AccountSkipped(
                        student,
                        phone,
                        "فشل إنشاء الحساب: " + string.Join(
                            "؛ ", createResult.Errors.Select(e => e.Description)));

                var roleResult = await _userManager.AddToRoleAsync(parent, AppRoles.Parent);

                if (!roleResult.Succeeded)
                {
                    // Roll the half-created account back so a retry can succeed.
                    await _userManager.DeleteAsync(parent);

                    return ParentAccountOutcome.AccountSkipped(
                        student,
                        phone,
                        "فشل إسناد دور ولي الأمر: " + string.Join(
                            "؛ ", roleResult.Errors.Select(e => e.Description)));
                }
            }

            // Idempotent on the (ParentUserId, StudentId) pair.
            var alreadyLinked = await _context.ParentStudentLinks
                .AnyAsync(l => l.ParentUserId == parent.Id && l.StudentId == student.Id, cancellationToken);

            if (!alreadyLinked)
            {
                _context.ParentStudentLinks.Add(new ParentStudentLink
                {
                    ParentUserId = parent.Id,
                    StudentId = student.Id,
                    CenterId = student.CenterId
                });

                await _context.SaveChangesAsync(cancellationToken);
            }

            return isNewAccount
                ? ParentAccountOutcome.AccountCreated(student, phone, temporaryPassword!)
                : ParentAccountOutcome.AccountLinked(student, phone, passwordChanged);
        }
        catch (Exception ex)
        {
            // One bad student must never abort a whole bulk run.
            return ParentAccountOutcome.AccountSkipped(student, phone, "خطأ غير متوقع: " + ex.Message);
        }
    }

    /// <summary>
    /// Returns true while the account still uses its phone as password, making
    /// sure the forced-change flag is set. Returns false when the parent already
    /// chose a permanent password (the account is never reset here).
    /// </summary>
    private async Task<bool> MarkTemporaryIfPhoneAsync(User user, string phone)
    {
        if (!await _userManager.CheckPasswordAsync(user, phone))
            return false;

        if (!user.MustChangePassword)
        {
            user.MustChangePassword = true;
            await _userManager.UpdateAsync(user);
        }

        return true;
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
