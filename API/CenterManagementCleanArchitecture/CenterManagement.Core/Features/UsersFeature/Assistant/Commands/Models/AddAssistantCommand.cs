public class AddAssistantCommand : IRequest<Response<string>>
{
    public string FullName { get; set; } = default!;

    public string PhoneNumber { get; set; } = default!;
    public string Password { get; set; } = default!;
    public string ConfirmPassword { get; set; } = default!;

    public decimal Salary { get; set; }

    public DateOnly? HireDate { get; set; }

    public string? Notes { get; set; }

    /// <summary>Optional teacher to link the assistant to. Null = center-wide.</summary>
    public Guid? TeacherId { get; set; }
}