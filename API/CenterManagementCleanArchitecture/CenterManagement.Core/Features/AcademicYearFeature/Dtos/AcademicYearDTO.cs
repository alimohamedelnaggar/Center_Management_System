namespace CenterManagement.Core.Features.AcademicYearFeature.Dtos;

public class AcademicYearDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public int Order { get; set; }
}