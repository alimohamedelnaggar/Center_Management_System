using CenterManagement.Data.Entities;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts;

namespace CenterManagement.Infrustructure.Repositories
{
    internal class PaymentRepository : GenericRepository<Payment>, IPaymentRepository
    {
        private readonly AppDbContext context;

        public PaymentRepository(AppDbContext context) : base(context)
        {
            this.context = context;
        }
        public async Task<bool> ExistsSessionPaymentAsync(Guid studentId, Guid sessionId, CancellationToken cancellationToken = default)
        {
            return await context.Payments.AnyAsync(x => x.StudentId == studentId && x.SessionId == sessionId, cancellationToken);
        }

        public IQueryable<Payment> GetPaymentsQuery()
        {
            return context.Payments
                .AsNoTracking()
                .Include(x => x.Student)
                .Include(x => x.Group)
                .Include(x => x.Session);
        }
        public async Task<List<Payment>> GetByStudentAsync(Guid studentId, CancellationToken cancellationToken = default)
        {
            return await context.Payments
                .Where(x => x.StudentId == studentId)
                .ToListAsync(cancellationToken);
        }
        public async Task<bool> ExistsSessionPaymentTodayAsync(
    Guid studentId,
    Guid sessionId,
    DateOnly paymentDate,
    CancellationToken cancellationToken = default)
        {
            return await context.Payments.AnyAsync(x =>
                x.StudentId == studentId &&
                x.SessionId == sessionId &&
                DateOnly.FromDateTime(x.PaymentDate) == paymentDate,
                cancellationToken);
        }

        public async Task<bool> ExistsMonthlyPaymentAsync(
            Guid studentId,
            DateOnly billingPeriod,
            CancellationToken cancellationToken = default)
        {
            return await context.Payments.AnyAsync(x =>
                x.StudentId == studentId &&
                x.BillingPeriod == billingPeriod,
                cancellationToken);
        }
        public async Task<List<Payment>> GetStudentPaymentsAsync(
    Guid studentId,
    CancellationToken cancellationToken = default)
        {
            return await context.Payments
                .AsNoTracking()
                .Where(x => x.StudentId == studentId)
                .Include(x => x.StudentAmounts)
                .OrderByDescending(x => x.PaymentDate)
                .ToListAsync(cancellationToken);
        }
        public async Task<StudentAmount?> GetLastStudentAmountAsync(
    Guid studentId,
    DateOnly billingPeriod,
    CancellationToken cancellationToken = default)
        {
            return await context.StudentAmounts
                .Include(x => x.Payment)
                .Where(x =>
                    x.Payment.StudentId == studentId &&
                    x.Payment.BillingPeriod == billingPeriod)
                .OrderByDescending(x => x.Payment.PaymentDate)
                .FirstOrDefaultAsync(cancellationToken);
        }
        public async Task<List<Payment>> GetAllPaymentsAsync()
        {
            return await context.Payments
                .Include(x => x.Student)
                .Include(x => x.Group)
                .Include(x => x.StudentAmounts)
                .Include(x => x.Session)
                .OrderByDescending(x => x.PaymentDate)
                .ToListAsync();
        }
        public async Task<StudentAmount?> GetLatestStudentAmountAsync(
    Guid studentId,
    CancellationToken cancellationToken = default)
        {
            return await context.StudentAmounts
                .Include(x => x.Payment)
                .Where(x => x.Payment.StudentId == studentId)
                .OrderByDescending(x => x.Payment.BillingPeriod)
                .ThenByDescending(x => x.Payment.PaymentDate)
                .FirstOrDefaultAsync(cancellationToken);
        }
        public async Task<Payment?> GetPaymentWithStudentAmountsAsync(
    Guid paymentId,
    CancellationToken cancellationToken = default)
        {
            return await context.Payments
                .Include(x => x.StudentAmounts)
                .FirstOrDefaultAsync(
                    x => x.Id == paymentId,
                    cancellationToken);
        }
        public async Task<List<Payment>> GetMonthlyPaymentsAsync(
    Guid studentId,
    DateOnly billingPeriod,
    CancellationToken cancellationToken = default)
        {
            return await context.Payments
                .Include(x => x.StudentAmounts)
                .Where(x =>
                    x.StudentId == studentId &&
                    x.BillingPeriod == billingPeriod)
                .OrderBy(x => x.PaymentDate)
                .ToListAsync(cancellationToken);
        }
        public IQueryable<StudentAmount> GetPaymentAmountsQuery()
        {
            return context.StudentAmounts
                .AsNoTracking()
                .Include(x => x.Payment)
                    .ThenInclude(x => x.Student)
                .Include(x => x.Payment)
                    .ThenInclude(x => x.Group)
                .Include(x => x.Payment)
                    .ThenInclude(x => x.Session);
        }
        public async Task<bool> IsMonthlyPaymentFullyPaidAsync(
    Guid studentId,
    DateOnly billingPeriod,
    CancellationToken cancellationToken = default)
        {
            return await context.StudentAmounts
                .AnyAsync(x =>
                    x.Payment.StudentId == studentId &&
                    x.Payment.BillingPeriod == billingPeriod &&
                    x.Status == PaymentStatus.FullyPaid,
                    cancellationToken);
        }
    }


}