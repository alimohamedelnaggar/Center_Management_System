public class EditAssistantCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }

    public string FullName { get; set; } = default!;

    public string PhoneNumber { get; set; } = default!;

    public decimal Salary { get; set; }

    public int? WorkingHoursPerWeek { get; set; }

    public DateOnly? HireDate { get; set; }

    public string? NationalId { get; set; }

    public string? Address { get; set; }

    public string? Notes { get; set; }

    /// <summary>Optional teacher to link the assistant to. Null = center-wide.</summary>
    public Guid? TeacherId { get; set; }

    public bool IsActive { get; set; }
}