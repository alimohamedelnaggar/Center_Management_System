namespace CenterManagement.Application.Features.Incomes.DTOs;

public record IncomeResponseDto(
    Guid Id,
    string Name,
    Guid CategoryId,
    string CategoryName,
    decimal Amount,
    DateOnly IncomeDate,
    string? Notes
);

