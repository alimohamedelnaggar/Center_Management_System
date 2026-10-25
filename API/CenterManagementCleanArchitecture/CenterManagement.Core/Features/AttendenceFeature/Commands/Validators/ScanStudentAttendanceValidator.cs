using CenterManagement.Core.Features.AttendenceFeature.Commands.Models;

namespace CenterManagement.Core.Features.AttendenceFeature.Commands.Validators;

public class ScanStudentAttendanceValidator : AbstractValidator<ScanStudentAttendanceCommand>
{
    public ScanStudentAttendanceValidator()
    {
        RuleFor(x => x.SessionId)
            .NotEmpty();

        RuleFor(x => x.Code)
            .NotEmpty();
    }
}