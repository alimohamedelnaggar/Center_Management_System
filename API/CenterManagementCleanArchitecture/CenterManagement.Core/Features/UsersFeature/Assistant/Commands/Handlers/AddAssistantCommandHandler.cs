

using CenterManagement.Core.Helpers;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.UsersFeature.Assistant.Commands.Handlers;

public sealed class AddAssistantCommandHandler
    : ResponseHandler,
      IRequestHandler<AddAssistantCommand, Response<string>>
{
    private readonly UserManager<User> _userManager;
    private readonly IRepositoryManager _repositoryManager;

    public AddAssistantCommandHandler(
        IStringLocalizer<SharedResources> localizer,
        UserManager<User> userManager,
        IRepositoryManager repositoryManager)
        : base(localizer)
    {
        _userManager = userManager;
        _repositoryManager = repositoryManager;
    }

    public async Task<Response<string>> Handle(
        AddAssistantCommand request,
        CancellationToken cancellationToken)
    {
        var fullName = request.FullName.Trim();
        var phoneNumber = request.PhoneNumber.Trim();

        // Check Phone Number
        var phoneExists = await _userManager.Users
            .AnyAsync(x => x.PhoneNumber == phoneNumber, cancellationToken);

        if (phoneExists)

            return BadRequest<string>("رقم الهاتف مستخدم بالفعل.");

        var email = UserEmailHelper.Normalize(request.Email);

        if (email is not null && await _userManager.FindByEmailAsync(email) is not null)
            return BadRequest<string>(UserEmailHelper.DuplicateMessage);

        if (request.Password != request.ConfirmPassword) return BadRequest<string>("كلمه المرور غير متطابقة");

        var assistant = new Assistent
        {
            FullName = fullName,
            UserName = phoneNumber,
            PhoneNumber = phoneNumber,
            Email = email,
            NormalizedEmail = email?.ToUpperInvariant(),
            EmailConfirmed = email is not null,

            Salary = request.Salary,
            HireDate = request.HireDate,

            Notes = request.Notes?.Trim(),

            TeacherId = request.TeacherId,

            IsActive = true
        };

        await using var transaction =
            await _repositoryManager.BeginTransactionAsync();

        try
        {
            var createResult = await _userManager.CreateAsync(
                assistant,
                request.Password);

            if (!createResult.Succeeded)
            {
                await transaction.RollbackAsync();

                return BadRequest<string>(
                    string.Join(Environment.NewLine,
                        createResult.Errors.Select(x => x.Description)));
            }

            // The role is fixed server-side: a caller can never mint a privileged
            // account through this endpoint.
            var roleResult = await _userManager.AddToRoleAsync(
                assistant,
                AppRoles.Assistant);

            if (!roleResult.Succeeded)
            {
                await transaction.RollbackAsync();

                return BadRequest<string>(
                    string.Join(Environment.NewLine,
                        roleResult.Errors.Select(x => x.Description)));
            }

            await transaction.CommitAsync();

            return Success("تم إنشاء المساعد بنجاح.");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();

            if (UserEmailHelper.IsDuplicateEmail(ex))
                return BadRequest<string>(UserEmailHelper.DuplicateMessage);

            return BadRequest<string>(
                ex.InnerException?.Message ?? ex.Message);
        }
    }
}