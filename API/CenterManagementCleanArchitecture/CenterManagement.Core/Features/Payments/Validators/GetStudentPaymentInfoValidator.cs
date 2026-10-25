using CenterManagement.Core.Features.Payments.Queries.Models;

public class GetStudentPaymentInfoValidator
    : AbstractValidator<GetStudentPaymentInfoQuery>
{
    public GetStudentPaymentInfoValidator(IStringLocalizer<SharedResources> localizer)
    {
        RuleFor(x => x.StudentId)
            .NotEmpty()
            .WithMessage(localizer[SharedResourcesKeys.Required]);
    }
}