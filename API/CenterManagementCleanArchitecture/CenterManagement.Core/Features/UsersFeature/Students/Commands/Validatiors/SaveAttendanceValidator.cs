using CenterManagement.Core.Features.AttendenceFeature.Commands.Models;

namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Validatiors;

public class SaveAttendanceValidator : AbstractValidator<SaveStudentAttendanceCommand>
{
    public SaveAttendanceValidator()
    {
        RuleFor(x => x.SessionId)
            .NotEmpty();

        RuleFor(x => x.Attendances)
            .NotEmpty();
    }
}
