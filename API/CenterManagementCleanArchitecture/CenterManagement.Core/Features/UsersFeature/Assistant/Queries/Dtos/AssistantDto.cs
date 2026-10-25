public class AssistantDto
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

    /// <summary>Linked teacher id, or null when the assistant works center-wide.</summary>
    public Guid? TeacherId { get; set; }

    /// <summary>Full name of the linked teacher, if any.</summary>
    public string? TeacherName { get; set; }

    public bool IsActive { get; set; }
}