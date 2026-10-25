using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.Groups.Commands.Validations
{
    public class UpdateGroupValidator : AbstractValidator<UpdateGroupCommand>
    {
        public UpdateGroupValidator()
        {
            RuleFor(x => x.Id).NotEmpty();

            RuleFor(x => x.Name)
             .NotEmpty().WithMessage("اسم المجموعة مطلوب.")
             .MaximumLength(100).WithMessage("اسم المجموعة لا يتجاوز 100 حرف.");

           
            RuleFor(x => x.MonthlyPrice)
                .GreaterThanOrEqualTo(0).WithMessage("سعر الشهر لا يمكن أن يكون بالسالب.");

        }
    }
}
