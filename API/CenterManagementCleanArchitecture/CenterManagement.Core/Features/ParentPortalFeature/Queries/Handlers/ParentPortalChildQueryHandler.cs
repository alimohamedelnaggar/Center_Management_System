using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Core.Features.ParentPortalFeature.Dtos;
using CenterManagement.Core.Features.ParentPortalFeature.Queries.Models;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Exams;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.ParentPortalFeature.Queries.Handlers;

/// <summary>
/// Serves the per-child sections of the parent portal.
///
/// Ordering matters and is deliberate: every request first proves the student is
/// linked to the signed-in parent (resolved from the JWT). When the student is
/// not linked the handler answers 404 — never 403 — so a parent cannot probe
/// which students exist. Only after the link is confirmed does the handler
/// enforce the section module, answering 403 (MODULE_DISABLED) when the center
/// has that section switched off. A locked section therefore never leaks data.
/// </summary>
public class ParentPortalChildQueryHandler : ResponseHandler,
    IRequestHandler<GetChildSummaryQuery, Response<ParentChildSummaryDTO>>,
    IRequestHandler<GetChildAttendanceQuery, Response<ParentChildAttendanceDTO>>,
    IRequestHandler<GetChildGradesQuery, Response<ParentChildGradesDTO>>,
    IRequestHandler<GetChildExamResultsQuery, Response<ParentChildExamResultsDTO>>,
    IRequestHandler<GetChildPaymentsQuery, Response<ParentChildPaymentsDTO>>
{
    private const int AttendanceRecordsLimit = 20;

    private readonly AppDbContext _context;
    private readonly IRepositoryManager _repositoryManager;
    private readonly IMediator _mediator;
    private readonly ITenantContext _tenantContext;
    private readonly ICenterModuleService _moduleService;

    public ParentPortalChildQueryHandler(
        AppDbContext context,
        IRepositoryManager repositoryManager,
        IMediator mediator,
        ITenantContext tenantContext,
        ICenterModuleService moduleService,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _context = context;
        _repositoryManager = repositoryManager;
        _mediator = mediator;
        _tenantContext = tenantContext;
        _moduleService = moduleService;
    }

    #region Summary

    public async Task<Response<ParentChildSummaryDTO>> Handle(
        GetChildSummaryQuery request,
        CancellationToken cancellationToken)
    {
        var child = await ResolveLinkedChildAsync(request.StudentId, cancellationToken);

        if (child is null)
            return NotFound<ParentChildSummaryDTO>(ChildNotFoundMessage);

        return Success(new ParentChildSummaryDTO
        {
            StudentId = child.Id,
            FullName = child.FullName,
            IsActive = child.IsActive
        });
    }

    #endregion

    #region Attendance

    public async Task<Response<ParentChildAttendanceDTO>> Handle(
        GetChildAttendanceQuery request,
        CancellationToken cancellationToken)
    {
        var child = await ResolveLinkedChildAsync(request.StudentId, cancellationToken);

        if (child is null)
            return NotFound<ParentChildAttendanceDTO>(ChildNotFoundMessage);

        if (!await IsSectionEnabledAsync(ModuleKeys.Attendance, child.CenterId, cancellationToken))
            return SectionLocked<ParentChildAttendanceDTO>();

        var records = await _repositoryManager.AttendanceRepository
            .GetTableNoTracking()
            .Where(x => x.StudentId == child.Id)
            .Include(x => x.Session)
                .ThenInclude(s => s.Group)
            .OrderByDescending(x => x.AttendanceDate)
            .ToListAsync(cancellationToken);

        var recordsDto = records
            .Take(AttendanceRecordsLimit)
            .Select(x => new ParentChildAttendanceRecordDTO
            {
                AttendanceDate = x.AttendanceDate,
                StatusName = GetAttendanceStatusName(x.Status),
                GroupName = x.Session?.Group?.Name ?? string.Empty,
                DayOfWeek = GetDayOfWeekName(x.Session?.DayOfWeek),
                StartTime = x.Session is not null ? x.Session.StartTime.ToString("HH:mm") : string.Empty,
                EndTime = x.Session is not null ? x.Session.EndTime.ToString("HH:mm") : string.Empty,
                Notes = x.Notes
            })
            .ToList();

        var present = records.Count(x => x.Status == AttendanceStatus.Present);
        var absent = records.Count(x => x.Status == AttendanceStatus.Absent);
        var late = records.Count(x => x.Status == AttendanceStatus.Late);
        var excused = records.Count(x => x.Status == AttendanceStatus.Excused);
        var total = records.Count;

        var percentage = total == 0
            ? 0
            : Math.Round((decimal)(present + late) / total * 100, 1);

        return Success(new ParentChildAttendanceDTO
        {
            TotalSessions = total,
            PresentCount = present,
            AbsentCount = absent,
            LateCount = late,
            ExcusedCount = excused,
            AttendancePercentage = percentage,
            Records = recordsDto
        });
    }

    #endregion

    #region Grades

    public async Task<Response<ParentChildGradesDTO>> Handle(
        GetChildGradesQuery request,
        CancellationToken cancellationToken)
    {
        var child = await ResolveLinkedChildAsync(request.StudentId, cancellationToken);

        if (child is null)
            return NotFound<ParentChildGradesDTO>(ChildNotFoundMessage);

        if (!await IsSectionEnabledAsync(ModuleKeys.Grades, child.CenterId, cancellationToken))
            return SectionLocked<ParentChildGradesDTO>();

        var rows = await _repositoryManager.StudentExamComponentRepository
            .GetTableNoTracking()
            .Where(x => x.StudentId == child.Id)
            .Include(x => x.ExamComponent)
                .ThenInclude(ec => ec.Exam)
            .ToListAsync(cancellationToken);

        var exams = rows
            .GroupBy(x => x.ExamComponent.Exam.Id)
            .Select(g => new ParentChildGradeExamDTO
            {
                ExamName = g.First().ExamComponent.Exam.Name,
                ExamDate = g.First().ExamComponent.Exam.ExamDate,
                Components = g.Select(x => new ParentChildGradeComponentDTO
                {
                    ComponentName = GetExamTypeName(x.ExamComponent.Type),
                    Mark = x.Mark,
                    TotalMarks = x.ExamComponent.TotalMarks,
                    IsAbsent = x.Mark == -1
                }).ToList()
            })
            .OrderByDescending(x => x.ExamDate)
            .ToList();

        return Success(new ParentChildGradesDTO { Exams = exams });
    }

    #endregion

    #region Exam results

    public async Task<Response<ParentChildExamResultsDTO>> Handle(
        GetChildExamResultsQuery request,
        CancellationToken cancellationToken)
    {
        var child = await ResolveLinkedChildAsync(request.StudentId, cancellationToken);

        if (child is null)
            return NotFound<ParentChildExamResultsDTO>(ChildNotFoundMessage);

        if (!await IsSectionEnabledAsync(ModuleKeys.OnlineExams, child.CenterId, cancellationToken))
            return SectionLocked<ParentChildExamResultsDTO>();

        // Same visibility rule as the student portal: only submitted attempts of
        // exams whose results have been published are ever exposed.
        var exams = await _repositoryManager.StudentExamAttemptRepository
            .GetTableNoTracking()
            .Where(a => a.StudentId == child.Id &&
                        a.Status == StudentExamAttemptStatus.Submitted &&
                        a.QuestionExam.IsResultsPublished)
            .Select(a => new ParentChildExamResultDTO
            {
                ExamName = a.QuestionExam.Name,
                Score = a.Score,
                TotalMark = a.TotalMark,
                SubmittedAt = a.SubmittedAt,
                HasPendingManualGrading = a.HasPendingManualGrading
            })
            .OrderByDescending(x => x.SubmittedAt)
            .ToListAsync(cancellationToken);

        return Success(new ParentChildExamResultsDTO { Exams = exams });
    }

    #endregion

    #region Payments

    public async Task<Response<ParentChildPaymentsDTO>> Handle(
        GetChildPaymentsQuery request,
        CancellationToken cancellationToken)
    {
        var child = await ResolveLinkedChildAsync(request.StudentId, cancellationToken);

        if (child is null)
            return NotFound<ParentChildPaymentsDTO>(ChildNotFoundMessage);

        if (!await IsSectionEnabledAsync(ModuleKeys.Payments, child.CenterId, cancellationToken))
            return SectionLocked<ParentChildPaymentsDTO>();

        var payments = await _repositoryManager.PaymentRepository
            .GetTableNoTracking()
            .Where(x => x.StudentId == child.Id)
            .Include(x => x.Group)
            .Include(x => x.StudentAmounts)
            .OrderByDescending(x => x.PaymentDate)
            .ToListAsync(cancellationToken);

        var items = payments
            .SelectMany(payment => payment.StudentAmounts.Select(amount => new
            {
                payment,
                amount
            }))
            .Select(x => new ParentChildPaymentDTO
            {
                GroupName = x.payment.Group.Name,
                PaymentDate = x.payment.PaymentDate,
                BillingPeriod = x.payment.BillingPeriod,
                PaidAmount = x.amount.PaidAmount,
                RemainingAmount = x.amount.RemainingAmount,
                StatusName = GetPaymentStatusName(x.amount.Status)
            })
            .ToList();

        var isOverdue = payments
            .SelectMany(p => p.StudentAmounts)
            .Any(a => a.Status is PaymentStatus.UnPaid or PaymentStatus.NotPaid);

        return Success(new ParentChildPaymentsDTO
        {
            TotalPaid = items.Sum(x => x.PaidAmount),
            TotalDue = items.Sum(x => x.RemainingAmount),
            LastPaymentDate = payments.Count > 0
                ? payments.Max(p => p.PaymentDate)
                : null,
            IsOverdue = isOverdue,
            Payments = items
        });
    }

    #endregion

    #region Helpers

    private const string ChildNotFoundMessage = "لا يوجد طالب مرتبط بحسابك";

    /// <summary>
    /// Resolves the target student only when the signed-in parent is linked to
    /// him. Returns <c>null</c> for an unlinked (or another center's) student,
    /// which the caller turns into a 404.
    /// </summary>
    private async Task<Student?> ResolveLinkedChildAsync(
        Guid studentId,
        CancellationToken cancellationToken)
    {
        var userId = (await _mediator.Send(new GetUserIdQuery(), cancellationToken)).Data;

        return await _context.ParentStudentLinks
            .AsNoTracking()
            .Where(l => l.ParentUserId == userId && l.StudentId == studentId)
            .Select(l => l.Student)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<bool> IsSectionEnabledAsync(
        string moduleKey,
        Guid? studentCenterId,
        CancellationToken cancellationToken)
    {
        var centerId = _tenantContext.CenterId ?? studentCenterId;

        if (centerId is null)
            return true;

        return await _moduleService.IsEnabledAsync(centerId.Value, moduleKey, cancellationToken);
    }

    private Response<T> SectionLocked<T>() => new()
    {
        StatusCode = HttpStatusCode.Forbidden,
        Succeeded = false,
        Code = ModuleAccessCodes.ModuleDisabled,
        Message = ModuleAccessCodes.ModuleDisabledMessage
    };

    private static string GetAttendanceStatusName(AttendanceStatus status) => status switch
    {
        AttendanceStatus.Present => "حاضر",
        AttendanceStatus.Absent => "غائب",
        AttendanceStatus.Late => "متأخر",
        AttendanceStatus.Excused => "بعذر",
        _ => "غير محدد"
    };

    private static string GetExamTypeName(ExamType type) => type switch
    {
        ExamType.Paragraph => "برجراف",
        ExamType.Dictation => "تسميع",
        ExamType.WrittenExam => "امتحان",
        _ => "غير محدد"
    };

    private static string GetPaymentStatusName(PaymentStatus status) => status switch
    {
        PaymentStatus.NotPaid => "غير مدفوع",
        PaymentStatus.PartialPaid => "مدفوع جزئياً",
        PaymentStatus.FullyPaid => "مدفوع بالكامل",
        PaymentStatus.UnPaid => "متأخر",
        PaymentStatus.NotApplicable => "لا ينطبق",
        _ => "غير محدد"
    };

    private static string GetDayOfWeekName(System.DayOfWeek? day) => day switch
    {
        System.DayOfWeek.Saturday => "السبت",
        System.DayOfWeek.Sunday => "الأحد",
        System.DayOfWeek.Monday => "الإثنين",
        System.DayOfWeek.Tuesday => "الثلاثاء",
        System.DayOfWeek.Wednesday => "الأربعاء",
        System.DayOfWeek.Thursday => "الخميس",
        System.DayOfWeek.Friday => "الجمعة",
        _ => string.Empty
    };

    #endregion
}
