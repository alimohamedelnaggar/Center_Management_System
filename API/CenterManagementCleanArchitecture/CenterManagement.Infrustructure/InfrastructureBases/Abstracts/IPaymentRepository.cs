using CenterManagement.Data.Entities;

namespace CenterManagement.Infrustructure.InfrastructureBases.Abstracts;

public interface IPaymentRepository : IGenericRepository<Payment>
{
    Task<bool> ExistsSessionPaymentAsync(
        Guid studentId,
        Guid sessionId,
        CancellationToken cancellationToken = default);

    IQueryable<Payment> GetPaymentsQuery();

    Task<List<Payment>> GetByStudentAsync(
Guid studentId,
CancellationToken cancellationToken = default);

    Task<bool> ExistsSessionPaymentTodayAsync(
Guid studentId,
Guid sessionId,
DateOnly paymentDate,
CancellationToken cancellationToken = default);

    Task<bool> ExistsMonthlyPaymentAsync(
        Guid studentId,
        DateOnly billingPeriod,
        CancellationToken cancellationToken = default);
    Task<List<Payment>> GetStudentPaymentsAsync(
Guid studentId,
CancellationToken cancellationToken = default);

    Task<StudentAmount?> GetLastStudentAmountAsync(
Guid studentId,
DateOnly billingPeriod,
CancellationToken cancellationToken = default);

    Task<List<Payment>> GetAllPaymentsAsync();
    Task<StudentAmount?> GetLatestStudentAmountAsync(
Guid studentId,
CancellationToken cancellationToken = default);

    Task<Payment?> GetPaymentWithStudentAmountsAsync(
    Guid paymentId,
    CancellationToken cancellationToken = default);

    Task<List<Payment>> GetMonthlyPaymentsAsync(
        Guid studentId,
        DateOnly billingPeriod,
        CancellationToken cancellationToken = default);

    IQueryable<StudentAmount> GetPaymentAmountsQuery();

    Task<bool> IsMonthlyPaymentFullyPaidAsync(
    Guid studentId,
    DateOnly billingPeriod,
    CancellationToken cancellationToken = default);
}