using CenterManagement.Core.Features.Payments.Queries.Models;
using CenterManagement.Core.Features.Payments.Queries.Results;
using CenterManagement.Core.Features.Payments.Shared;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Payments.Queries.Handlers;

public class GetStudentPaymentInfoHandler : ResponseHandler,
    IRequestHandler<GetStudentPaymentInfoQuery, Response<StudentPaymentInfoDto>>
{
    private readonly IRepositoryManager _repository;
    private readonly IUserScopeService _scopeService;

    public GetStudentPaymentInfoHandler(
        IRepositoryManager repository,
        IUserScopeService scopeService,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        _repository = repository;
        _scopeService = scopeService;
    }

    public async Task<Response<StudentPaymentInfoDto>> Handle(
      GetStudentPaymentInfoQuery request,
      CancellationToken cancellationToken)
    {
        var student = await _repository.StudentRepository
            .GetTableNoTracking()
            .Where(s => s.Id == request.StudentId)
            .Select(s => new
            {
                s.Id,
                s.FullName,
                s.SubscriptionType,
                s.CustomMonthlyPrice,
                ActiveGroup = s.StudentGroups
                    .Where(sg => sg.IsActive && sg.LeftAt == null)
                    .Select(sg => sg.Group)
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (student is null)
            return NotFound<StudentPaymentInfoDto>("الطالب غير موجود.");

        if (!await _scopeService.AllowsStudentAsync(request.StudentId, cancellationToken))
            return NotFound<StudentPaymentInfoDto>("الطالب غير موجود.");

        if (student.ActiveGroup is null)
            return BadRequest<StudentPaymentInfoDto>("الطالب غير مضاف إلى أي مجموعة حالياً.");

        var group = student.ActiveGroup;

        var billingPeriod = request.BillingPeriod.HasValue
            ? new DateOnly(request.BillingPeriod.Value.Year, request.BillingPeriod.Value.Month, 1)
            : (DateOnly?)null;

        StudentAmount? lastAmount = null;
        var attendedSessions = 0;

        if (billingPeriod.HasValue)
        {
            lastAmount = await _repository.PaymentRepository
                .GetLastStudentAmountAsync(student.Id, billingPeriod.Value, cancellationToken);

            attendedSessions = await _repository.AttendanceRepository
                .CountAttendedSessionsAsync(student.Id, group.Id, billingPeriod.Value, cancellationToken);
        }

        var sessionsCount = request.SessionsCount ?? lastAmount?.BilledSessions;

        var billing = MonthlyBillingCalculator.Calculate(
            group.MonthlyPrice,
            student.CustomMonthlyPrice,
            group.SessionsPerMonth,
            sessionsCount);

        var previouslyPaid = lastAmount?.PaidAmount ?? 0;

        return Success(new StudentPaymentInfoDto
        {
            StudentId = student.Id,
            StudentName = student.FullName,
            GroupId = group.Id,
            GroupName = group.Name,
            SubscriptionType = student.SubscriptionType,

            MonthlyPrice = billing.EffectiveMonthlyPrice,
            GroupMonthlyPrice = billing.GroupMonthlyPrice,
            HasDiscount = billing.HasDiscount,
            DiscountAmount = billing.DiscountAmount,

            SessionsPerMonth = billing.SessionsPerMonth,
            PricePerSession = billing.PricePerSession,
            AttendedSessions = attendedSessions,
            BilledSessions = billing.BilledSessions,
            IsFullMonth = billing.IsFullMonth,

            TotalAmount = billing.TotalAmount,
            PreviouslyPaid = previouslyPaid,
            RemainingAmount = Math.Max(0, billing.TotalAmount - previouslyPaid),

            CalculationText = billing.CalculationText
        });
    }
}