using CenterManagement.Core.Features.ParentPortalFeature.Commands.Models;
using CenterManagement.Core.Features.ParentPortalFeature.Dtos;
using CenterManagement.Core.Features.ParentPortalFeature.Services;

namespace CenterManagement.Core.Features.ParentPortalFeature.Commands.Handlers;

public class CreateParentAccountCommandHandler : ResponseHandler,
    IRequestHandler<CreateParentAccountCommand, Response<CreateParentAccountResult>>
{
    private readonly AppDbContext _context;
    private readonly IParentAccountService _parentAccountService;

    public CreateParentAccountCommandHandler(
        AppDbContext context,
        IParentAccountService parentAccountService,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _context = context;
        _parentAccountService = parentAccountService;
    }

    public async Task<Response<CreateParentAccountResult>> Handle(
        CreateParentAccountCommand request,
        CancellationToken cancellationToken)
    {
        var student = await _context.Students
            .FirstOrDefaultAsync(s => s.Id == request.StudentId, cancellationToken);

        if (student is null)
            return NotFound<CreateParentAccountResult>("الطالب غير موجود");

        var outcome = await _parentAccountService.EnsureAccountAsync(student, cancellationToken);

        if (outcome.Status == ParentAccountOutcomeStatus.Skipped)
            return BadRequest<CreateParentAccountResult>(outcome.Reason);

        var result = new CreateParentAccountResult
        {
            StudentId = outcome.StudentId,
            StudentName = outcome.StudentName,
            ParentPhone = outcome.ParentPhone,
            TemporaryPassword = outcome.TemporaryPassword,
            LinkedExistingAccount = outcome.LinkedExistingAccount
        };

        var message = outcome.LinkedExistingAccount
            ? "تم ربط الطالب بحساب ولي الأمر الموجود"
            : "تم إنشاء حساب ولي الأمر بنجاح";

        return Success(result, message);
    }
}
