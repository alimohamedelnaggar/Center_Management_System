using CenterManagement.Core.Common;
using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Core.Features.NotificationFeature.Dtos;
using CenterManagement.Core.Features.StudentPortalFeature.Dtos;
using CenterManagement.Core.Features.StudentPortalFeature.Queries.Models;
using CenterManagement.Data.Enums;
using CenterManagement.Data.Entities.Notifications;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.StudentPortalFeature.Queries.Handlers;

public class StudentPortalQueryHandler : ResponseHandler,
    IRequestHandler<GetStudentProfileQuery, Response<StudentProfileDTO>>,
    IRequestHandler<GetAvailableStudentExamsQuery, Response<List<StudentExamListItemDTO>>>,
    IRequestHandler<GetStudentAttemptQuery, Response<StudentAttemptDTO>>,
    IRequestHandler<GetStudentResultsQuery, Response<List<StudentResultDTO>>>,
    IRequestHandler<GetStudentExamPreviewQuery, Response<StudentExamPreviewDTO>>,
    IRequestHandler<GetStudentNotificationsQuery, Response<PaginatedResult<NotificationDTO>>>,
    IRequestHandler<GetStudentUnreadNotificationsCountQuery, Response<int>>,
    IRequestHandler<GetStudentSubscriptionsQuery, Response<List<StudentSubscriptionDTO>>>,
    IRequestHandler<GetStudentAttendanceQuery, Response<StudentAttendanceSummaryDTO>>,
    IRequestHandler<GetStudentPaymentsQuery, Response<StudentPaymentsDTO>>,
    IRequestHandler<GetStudentNotesQuery, Response<List<StudentNoteDTO>>>
{
    #region Fields
    private readonly IRepositoryManager _repositoryManager;
    private readonly IMediator _mediator;
    #endregion

    #region Constructors
    public StudentPortalQueryHandler(
        IRepositoryManager repositoryManager,
        IMediator mediator,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _repositoryManager = repositoryManager;
        _mediator = mediator;
    }
    #endregion

    #region Handle Functions

    public async Task<Response<StudentProfileDTO>> Handle(
        GetStudentProfileQuery request,
        CancellationToken cancellationToken)
    {
        var student = await GetCurrentStudentAsync(cancellationToken);

        if (student == null)
            return NotFound<StudentProfileDTO>("لا يوجد طالب مرتبط بهذا الحساب");

        var activeGroups = student.StudentGroups
            .Where(sg => sg.IsActive && sg.LeftAt == null)
            .ToList();

        return Success(new StudentProfileDTO
        {
            StudentId = student.Id,
            FullName = student.FullName,
            Phone = student.PhoneNumber,
            ParentPhoneNumber = student.ParentPhoneNumber,
            School = student.School,
            IsActive = student.IsActive,
            IsPaid = student.IsPaid,
            SubscriptionType = (int)student.SubscriptionType,
            SubscriptionTypeName = GetSubscriptionTypeName(student.SubscriptionType),
            Groups = activeGroups.Select(sg => sg.Group.Name).ToList(),
            Subscriptions = student.StudentGroups
                .OrderByDescending(sg => sg.IsActive)
                .ThenByDescending(sg => sg.JoinDate)
                .Select(sg => new StudentSubscriptionDTO
                {
                    GroupId = sg.GroupId,
                    GroupName = sg.Group.Name,
                    JoinDate = sg.JoinDate,
                    LeftAt = sg.LeftAt,
                    IsActive = sg.IsActive && sg.LeftAt == null,
                    MonthlyPrice = sg.Group.MonthlyPrice,
                    SessionsPerMonth = sg.Group.SessionsPerMonth
                })
                .ToList()
        });
    }

    public async Task<Response<List<StudentExamListItemDTO>>> Handle(
        GetAvailableStudentExamsQuery request,
        CancellationToken cancellationToken)
    {
        var student = await GetCurrentStudentAsync(cancellationToken);

        if (student == null)
            return NotFound<List<StudentExamListItemDTO>>("لا يوجد طالب مرتبط بهذا الحساب");

        var groupIds = student.StudentGroups
            .Where(sg => sg.IsActive && sg.LeftAt == null)
            .Select(sg => sg.GroupId)
            .ToList();

        if (groupIds.Count == 0)
            return Success(new List<StudentExamListItemDTO>());

        var exams = await _repositoryManager.QuestionExamRepository
            .GetTableNoTracking()
            .Where(x => x.Mode == QuestionExamMode.Electronic &&
                        groupIds.Contains(x.GroupId))
            .Select(x => new
            {
                x.Id,
                x.Name,
                GroupName = x.Group.Name,
                x.ExamDate,
                x.DurationMinutes,
                QuestionsCount = x.Questions.Count(),
                TotalMarks = x.Questions.Sum(q => (decimal?)q.Mark) ?? 0
            })
            .OrderByDescending(x => x.ExamDate)
            .ToListAsync(cancellationToken);

        var examIds = exams.Select(e => e.Id).ToList();

        var attempts = await _repositoryManager.StudentExamAttemptRepository
            .GetTableNoTracking()
            .Where(a => a.StudentId == student.Id && examIds.Contains(a.QuestionExamId))
            .ToListAsync(cancellationToken);

        var now = DateTime.Now;

        var result = exams.Select(e =>
        {
            var endAt = e.ExamDate.AddMinutes(e.DurationMinutes);
            var attempt = attempts.FirstOrDefault(a => a.QuestionExamId == e.Id);

            string status;
            if (attempt != null && attempt.Status == StudentExamAttemptStatus.Submitted)
                status = "finished";
            else if (attempt != null)
                status = "inprogress";
            else if (now < e.ExamDate)
                status = "upcoming";
            else if (now <= endAt)
                status = "available";
            else
                status = "expired";

            return new StudentExamListItemDTO
            {
                ExamId = e.Id,
                Name = e.Name,
                GroupName = e.GroupName,
                ExamDate = e.ExamDate,
                EndAt = endAt,
                DurationMinutes = e.DurationMinutes,
                QuestionsCount = e.QuestionsCount,
                TotalMarks = e.TotalMarks,
                Status = status,
                AttemptId = attempt?.Id,
                Score = attempt?.Score,
                ScoredTotalMark = attempt?.TotalMark,
                HasPendingManualGrading = attempt?.HasPendingManualGrading ?? false
            };
        }).ToList();

        return Success(result);
    }

    public async Task<Response<StudentAttemptDTO>> Handle(
        GetStudentAttemptQuery request,
        CancellationToken cancellationToken)
    {
        var student = await GetCurrentStudentAsync(cancellationToken);

        if (student == null)
            return NotFound<StudentAttemptDTO>("لا يوجد طالب مرتبط بهذا الحساب");

        var attempt = await _repositoryManager.StudentExamAttemptRepository
            .GetTableNoTracking()
            .Include(a => a.QuestionExam)
                .ThenInclude(e => e.Questions)
                .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(a => a.Id == request.AttemptId, cancellationToken);

        if (attempt == null || attempt.StudentId != student.Id)
            return NotFound<StudentAttemptDTO>("المحاولة غير موجودة");

        return Success(BuildAttemptDto(attempt));
    }

    public async Task<Response<List<StudentResultDTO>>> Handle(
        GetStudentResultsQuery request,
        CancellationToken cancellationToken)
    {
        var student = await GetCurrentStudentAsync(cancellationToken);

        if (student == null)
            return NotFound<List<StudentResultDTO>>("لا يوجد طالب مرتبط بهذا الحساب");

        var results = await _repositoryManager.StudentExamAttemptRepository
            .GetTableNoTracking()
            .Where(a => a.StudentId == student.Id &&
                        a.Status == StudentExamAttemptStatus.Submitted)
            .Select(a => new StudentResultDTO
            {
                ExamId = a.QuestionExamId,
                ExamName = a.QuestionExam.Name,
                Score = a.QuestionExam.IsResultsPublished ? a.Score : (decimal?)null,
                TotalMark = a.TotalMark,
                SubmittedAt = a.SubmittedAt,
                HasPendingManualGrading = a.HasPendingManualGrading,
                IsPublished = a.QuestionExam.IsResultsPublished,
                Status = "finished"
            })
            .OrderByDescending(x => x.SubmittedAt)
            .ToListAsync(cancellationToken);

        return Success(results);
    }

    public async Task<Response<StudentExamPreviewDTO>> Handle(
        GetStudentExamPreviewQuery request,
        CancellationToken cancellationToken)
    {
        var student = await GetCurrentStudentAsync(cancellationToken);

        if (student == null)
            return NotFound<StudentExamPreviewDTO>("لا يوجد طالب مرتبط بهذا الحساب");

        var attempt = await _repositoryManager.StudentExamAttemptRepository
            .GetTableNoTracking()
            .Include(a => a.Answers)
            .Include(a => a.QuestionExam)
                .ThenInclude(e => e.Questions)
                    .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(a =>
                a.QuestionExamId == request.ExamId &&
                a.StudentId == student.Id &&
                a.Status == StudentExamAttemptStatus.Submitted,
                cancellationToken);

        if (attempt == null)
            return NotFound<StudentExamPreviewDTO>("لا يوجد تسليم لهذا الامتحان");

        if (!attempt.QuestionExam.IsResultsPublished)
            return BadRequest<StudentExamPreviewDTO>("لم يتم نشر نتائج هذا الامتحان بعد");

        var questions = ExamShuffleHelper
            .OrderQuestions(
                attempt.QuestionExam.Questions.Where(q => !q.IsDeleted),
                attempt.QuestionExamId,
                attempt.StudentId,
                attempt.QuestionExam.ShuffleQuestions)
            .Select((q, index) =>
            {
                var answer = attempt.Answers
                    .FirstOrDefault(a => a.QuestionExamQuestionId == q.Id);

                var correctOption = q.Options
                    .FirstOrDefault(o => o.IsCorrect && !o.IsDeleted);

                return new StudentExamPreviewQuestionDTO
                {
                    Id = q.Id,
                    Order = index + 1,
                    Type = (int)q.Type,
                    TypeName = GetTypeName(q.Type),
                    Text = q.Text,
                    ImageName = q.ImageName,
                    Mark = q.Mark,
                    AwardedMark = answer?.AwardedMark ?? 0,
                    IsCorrect = answer?.IsCorrect,
                    SelectedOptionId = answer?.SelectedOptionId,
                    EssayAnswer = answer?.EssayAnswer,
                    CorrectOptionId = correctOption?.Id,
                    Options = ExamShuffleHelper
                        .OrderOptions(
                            q.Options.Where(o => !o.IsDeleted),
                            attempt.QuestionExamId,
                            attempt.StudentId,
                            q.Id,
                            attempt.QuestionExam.ShuffleOptions)
                        .Select((o, optionIndex) => new StudentExamPreviewOptionDTO
                        {
                            Id = o.Id,
                            Order = optionIndex + 1,
                            Text = o.Text,
                            IsCorrect = o.IsCorrect
                        })
                        .ToList()
                };
            })
            .ToList();

        return Success(new StudentExamPreviewDTO
        {
            ExamId = attempt.QuestionExamId,
            ExamName = attempt.QuestionExam.Name,
            Score = attempt.Score,
            TotalMark = attempt.TotalMark,
            SubmittedAt = attempt.SubmittedAt,
            HasPendingManualGrading = attempt.HasPendingManualGrading,
            Questions = questions
        });
    }

    public async Task<Response<PaginatedResult<NotificationDTO>>> Handle(
        GetStudentNotificationsQuery request,
        CancellationToken cancellationToken)
    {
        var userId = (await _mediator.Send(new GetUserIdQuery(), cancellationToken)).Data;

        var query = _repositoryManager.NotificationRepository
            .GetTableNoTracking()
            .Where(x => x.UserId == userId);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new NotificationDTO
            {
                Id = x.Id,
                Title = x.Title,
                Body = x.Body,
                Type = x.Type,
                ReferenceId = x.ReferenceId,
                ReferenceType = x.ReferenceType,
                IsRead = x.IsRead,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Success(PaginatedResult<NotificationDTO>.Success(
            items,
            totalCount,
            request.PageNumber,
            request.PageSize));
    }

    public async Task<Response<int>> Handle(
        GetStudentUnreadNotificationsCountQuery request,
        CancellationToken cancellationToken)
    {
        var userId = (await _mediator.Send(new GetUserIdQuery(), cancellationToken)).Data;

        var count = await _repositoryManager.NotificationRepository
            .GetTableNoTracking()
            .CountAsync(x => x.UserId == userId && !x.IsRead, cancellationToken);

        return Success(count);
    }

    public async Task<Response<List<StudentSubscriptionDTO>>> Handle(
        GetStudentSubscriptionsQuery request,
        CancellationToken cancellationToken)
    {
        var student = await GetCurrentStudentAsync(cancellationToken);

        if (student == null)
            return NotFound<List<StudentSubscriptionDTO>>("لا يوجد طالب مرتبط بهذا الحساب");

        var result = student.StudentGroups
            .OrderByDescending(sg => sg.IsActive)
            .ThenByDescending(sg => sg.JoinDate)
            .Select(sg => new StudentSubscriptionDTO
            {
                GroupId = sg.GroupId,
                GroupName = sg.Group.Name,
                JoinDate = sg.JoinDate,
                LeftAt = sg.LeftAt,
                IsActive = sg.IsActive && sg.LeftAt == null,
                MonthlyPrice = sg.Group.MonthlyPrice,
                SessionsPerMonth = sg.Group.SessionsPerMonth
            })
            .ToList();

        return Success(result);
    }

    public async Task<Response<StudentAttendanceSummaryDTO>> Handle(
        GetStudentAttendanceQuery request,
        CancellationToken cancellationToken)
    {
        var student = await GetCurrentStudentAsync(cancellationToken);

        if (student == null)
            return NotFound<StudentAttendanceSummaryDTO>("لا يوجد طالب مرتبط بهذا الحساب");

        var records = await _repositoryManager.AttendanceRepository
            .GetTableNoTracking()
            .Where(x => x.StudentId == student.Id)
            .Include(x => x.Session)
                .ThenInclude(s => s.Group)
            .OrderByDescending(x => x.AttendanceDate)
            .ToListAsync(cancellationToken);

        var recordsDto = records.Select(x => new StudentAttendanceRecordDTO
        {
            AttendanceDate = x.AttendanceDate,
            Status = (int)x.Status,
            StatusName = GetAttendanceStatusName(x.Status),
            GroupName = x.Session?.Group?.Name ?? string.Empty,
            DayOfWeek = GetDayOfWeekName(x.Session?.DayOfWeek),
            StartTime = x.Session != null ? x.Session.StartTime.ToString("HH:mm") : string.Empty,
            EndTime = x.Session != null ? x.Session.EndTime.ToString("HH:mm") : string.Empty,
            Notes = x.Notes
        }).ToList();

        var present = records.Count(x => x.Status == AttendanceStatus.Present);
        var absent = records.Count(x => x.Status == AttendanceStatus.Absent);
        var late = records.Count(x => x.Status == AttendanceStatus.Late);
        var excused = records.Count(x => x.Status == AttendanceStatus.Excused);

        var total = records.Count;
        var percentage = total == 0
            ? 0
            : Math.Round((decimal)(present + late) / total * 100, 1);

        return Success(new StudentAttendanceSummaryDTO
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

    public async Task<Response<StudentPaymentsDTO>> Handle(
        GetStudentPaymentsQuery request,
        CancellationToken cancellationToken)
    {
        var student = await GetCurrentStudentAsync(cancellationToken);

        if (student == null)
            return NotFound<StudentPaymentsDTO>("لا يوجد طالب مرتبط بهذا الحساب");

        var payments = await _repositoryManager.PaymentRepository
            .GetTableNoTracking()
            .Where(x => x.StudentId == student.Id)
            .Include(x => x.Group)
            .Include(x => x.StudentAmounts)
            .OrderByDescending(x => x.PaymentDate)
            .ToListAsync(cancellationToken);

        var items = payments
            .SelectMany(payment => payment.StudentAmounts.Select(amount => new StudentPaymentDTO
            {
                PaymentId = payment.Id,
                GroupName = payment.Group.Name,
                PaymentDate = payment.PaymentDate,
                BillingPeriod = payment.BillingPeriod,
                SubscriptionType = (int)student.SubscriptionType,
                Amount = amount.Amount,
                TotalAmount = amount.TotalAmount,
                PaidAmount = amount.PaidAmount,
                RemainingAmount = amount.RemainingAmount,
                Status = (int)amount.Status,
                StatusName = GetPaymentStatusName(amount.Status),
                Notes = payment.Notes
            }))
            .ToList();

        return Success(new StudentPaymentsDTO
        {
            TotalPaid = items.Sum(x => x.PaidAmount),
            TotalDue = items.Sum(x => x.RemainingAmount),
            PaymentsCount = items.Count,
            Payments = items
        });
    }

    public async Task<Response<List<StudentNoteDTO>>> Handle(
        GetStudentNotesQuery request,
        CancellationToken cancellationToken)
    {
        var student = await GetCurrentStudentAsync(cancellationToken);

        if (student == null)
            return NotFound<List<StudentNoteDTO>>("لا يوجد طالب مرتبط بهذا الحساب");

        var groupIds = student.StudentGroups
            .Where(sg => sg.IsActive && sg.LeftAt == null)
            .Select(sg => sg.GroupId)
            .ToList();

        if (groupIds.Count == 0)
            return Success(new List<StudentNoteDTO>());

        var notes = await _repositoryManager.StudyNoteRepository
            .GetTableNoTracking()
            .Where(n => n.StudyNoteGroups.Any(g => groupIds.Contains(g.GroupId)))
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new StudentNoteDTO
            {
                Id = n.Id,
                Title = n.Title,
                Description = n.Description,
                FileName = n.FileName,
                OriginalFileName = n.OriginalFileName,
                FileSize = n.FileSize,
                CreatedAt = n.CreatedAt,
                GroupNames = n.StudyNoteGroups.Select(g => g.Group.Name).ToList()
            })
            .ToListAsync(cancellationToken);

        return Success(notes);
    }

    #endregion

    #region Helpers

    private async Task<Student?> GetCurrentStudentAsync(CancellationToken cancellationToken)
    {
        var userId = (await _mediator.Send(new GetUserIdQuery(), cancellationToken)).Data;

        return await _repositoryManager.StudentRepository
            .GetTableNoTracking()
            .Include(x => x.StudentGroups)
                .ThenInclude(sg => sg.Group)
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
    }

    private static StudentAttemptDTO BuildAttemptDto(
        StudentExamAttempt attempt,
        DateTime? nowOverride = null)
    {
        var now = nowOverride ?? DateTime.Now;
        var remaining = (int)Math.Ceiling(
            attempt.QuestionExam.DurationMinutes * 60 -
            (now - attempt.StartedAt).TotalSeconds);

        if (remaining < 0)
            remaining = 0;

        return new StudentAttemptDTO
        {
            AttemptId = attempt.Id,
            ExamId = attempt.QuestionExamId,
            ExamName = attempt.QuestionExam.Name,
            DurationMinutes = attempt.QuestionExam.DurationMinutes,
            StartedAt = attempt.StartedAt,
            ServerNow = now,
            RemainingSeconds = remaining,
            TotalMark = attempt.TotalMark,
            IsSubmitted = attempt.Status == StudentExamAttemptStatus.Submitted,
            Questions = attempt.QuestionExam.Questions
                .OrderBy(q => q.Order)
                .Select(q => new StudentAttemptQuestionDTO
                {
                    Id = q.Id,
                    Type = (int)q.Type,
                    TypeName = GetTypeName(q.Type),
                    Text = q.Text,
                    ImageName = q.ImageName,
                    Mark = q.Mark,
                    Order = q.Order,
                    Options = q.Options
                        .OrderBy(o => o.Order)
                        .Select(o => new StudentAttemptOptionDTO
                        {
                            Id = o.Id,
                            Order = o.Order,
                            Text = o.Text
                        })
                        .ToList()
                })
                .ToList()
        };
    }

    private static string GetTypeName(QuestionType type)
    {
        return type switch
        {
            QuestionType.TrueFalse => "صح وغلط",
            QuestionType.MultipleChoice => "اختيار من متعدد",
            QuestionType.Essay => "مقالي",
            _ => "غير محدد"
        };
    }

    private static string GetSubscriptionTypeName(SubscriptionType type)
    {
        return type switch
        {
            SubscriptionType.Session => "بالحصة",
            SubscriptionType.Month => "شهري",
            _ => "غير محدد"
        };
    }

    private static string GetAttendanceStatusName(AttendanceStatus status)
    {
        return status switch
        {
            AttendanceStatus.Present => "حاضر",
            AttendanceStatus.Absent => "غائب",
            AttendanceStatus.Late => "متأخر",
            AttendanceStatus.Excused => "بعذر",
            _ => "غير محدد"
        };
    }

    private static string GetPaymentStatusName(PaymentStatus status)
    {
        return status switch
        {
            PaymentStatus.NotPaid => "غير مدفوع",
            PaymentStatus.PartialPaid => "مدفوع جزئياً",
            PaymentStatus.FullyPaid => "مدفوع بالكامل",
            PaymentStatus.UnPaid => "متأخر",
            PaymentStatus.NotApplicable => "لا ينطبق",
            _ => "غير محدد"
        };
    }

    private static string GetDayOfWeekName(DayOfWeek day)
    {
        return day switch
        {
            System.DayOfWeek.Saturday => "السبت",
            System.DayOfWeek.Sunday => "الأحد",
            System.DayOfWeek.Monday => "الإثنين",
            System.DayOfWeek.Tuesday => "الثلاثاء",
            System.DayOfWeek.Wednesday => "الأربعاء",
            System.DayOfWeek.Thursday => "الخميس",
            System.DayOfWeek.Friday => "الجمعة",
            _ => "غير محدد"
        };
    }

    private static string GetDayOfWeekName(DayOfWeek? day)
    {
        return day.HasValue ? GetDayOfWeekName(day.Value) : string.Empty;
    }

    #endregion
}
