namespace CenterManagement.Core.Features.AcademicYearFeature.Commands.Models;

public class AddAcademicYearCommand : IRequest<Response<string>>
{
    public string Name { get; set; } = default!;
    public int Order { get; set; } = 0;
}

public class EditAcademicYearCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public int Order { get; set; } = 0;
}

public class DeleteAcademicYearCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }

    public DeleteAcademicYearCommand(Guid id)
    {
        Id = id;
    }
}