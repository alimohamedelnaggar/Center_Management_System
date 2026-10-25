using CenterManagement.Core.Common;
using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Core.Features.StudentPortalFeature.Commands.Models;
using CenterManagement.Core.Features.StudentPortalFeature.Dtos;
using CenterManagement.Data.Entities.Notifications;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.StudentPortalFeature.Commands.Handlers;

public class StudentPortalCommandHandler : ResponseHandler,
    IRequestHandler<StartStudentExamCommand, Response<StudentAttemptDTO>>,
    IRequestHandler<SubmitStudentExamCommand, Response<StudentResultDTO>>,
    IRequestHandler<ReportExamViolationCommand, Response<string>>,
    IRequestHandler<MarkNotificationReadCommand, Response<string>>,
    IRequestHandler<MarkAllNotificationsReadCommand, Response<string>>
{
    #region Fields
    private readonly IRepositoryManager _repositoryManager;
    private readonly IMediator _mediator;
    #endregion

    #region Constructors
    public StudentPortalCommandHandler(
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

    public async Task<Response<StudentAttemptDTO>> Handle(
        StartStudentExamCommand request,
        CancellationToken cancellationToken)
    {
        var student = await GetCurrentStudentAsync(cancellationToken);

        if (student == null)
            return NotFound<StudentAttemptDTO>("لا يوجد طالب مرتبط بهذا الحساب");

        var exam = await _repositoryManager.QuestionExamRepository
            .GetTableNoTracking()
            .Include(x => x.Questions)
                .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(x => x.Id == request.ExamId, cancellationToken);

        if (exam == null || exam.Mode != QuestionExamMode.Electronic)
            return NotFound<StudentAttemptDTO>("الامتحان غير متاح");

        var isMember = await _repositoryManager.StudentGroupRepository
            .GetTableNoTracking()
            .AnyAsync(sg =>
                sg.StudentId == student.Id &&
                sg.GroupId == exam.GroupId &&
                sg.IsActive &&
                sg.LeftAt == null, cancellationToken);

        if (!isMember)
            return BadRequest<StudentAttemptDTO>("هذا الامتحان غير متاح لك");

        var now = DateTime.Now;
        var endAt = exam.ExamDate.AddMinutes(exam.DurationMinutes);

        if (now < exam.ExamDate)
            return BadRequest<StudentAttemptDTO>("لم يبدأ وقت الامتحان بعد");

        if (now > endAt)
            return BadRequest<StudentAttemptDTO>("انتهى وقت الامتحان");

        var existing = await _repositoryManager.StudentExamAttemptRepository
            .GetTableTracking()
            .Include(a => a.QuestionExam)
                .ThenInclude(e => e.Questions)
                .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(a =>
                a.QuestionExamId == exam.Id && a.StudentId == student.Id,
                cancellationToken);

        if (existing != null)
        {
            if (existing.Status == StudentExamAttemptStatus.Submitted)
                return BadRequest<StudentAttemptDTO>("لقد سلّمت هذا الامتحان بالفعل");

            if (existing.QuestionExam == null)
                existing.QuestionExam = exam;

            return Success(BuildAttemptDto(existing, now));
        }

        var attempt = new StudentExamAttempt
        {
            QuestionExamId = exam.Id,
            StudentId = student.Id,
            StartedAt = now,
            Status = StudentExamAttemptStatus.InProgress,
            TotalMark = exam.Questions.Sum(q => q.Mark)
        };

        await _repositoryManager.StudentExamAttemptRepository.AddAsync(attempt);
        await _repositoryManager.SaveChangesAsync();

        attempt.QuestionExam = exam;

        return Success(BuildAttemptDto(attempt, now));
    }

    public async Task<Response<StudentResultDTO>> Handle(
        SubmitStudentExamCommand request,
        CancellationToken cancellationToken)
    {
        var student = await GetCurrentStudentAsync(cancellationToken);

        if (student == null)
            return NotFound<StudentResultDTO>("لا يوجد طالب مرتبط بهذا الحساب");

        var attempt = await _repositoryManager.StudentExamAttemptRepository
            .GetTableTracking()
            .Include(a => a.QuestionExam)
                .ThenInclude(e => e.Questions)
                .ThenInclude(q => q.Options)
            .Include(a => a.Answers)
            .FirstOrDefaultAsync(a => a.Id == request.AttemptId, cancellationToken);

        if (attempt == null || attempt.StudentId != student.Id)
            return NotFound<StudentResultDTO>("المحاولة غير موجودة");

        if (attempt.Status == StudentExamAttemptStatus.Submitted)
            return BadRequest<StudentResultDTO>("تم تسليم هذا الامتحان بالفعل");

        var now = DateTime.Now;
        var provided = request.Answers ?? new List<StudentSubmitAnswerDTO>();

        var answers = new List<StudentExamAnswer>();
        decimal score = 0;
        var pending = false;

        foreach (var question in attempt.QuestionExam.Questions)
        {
            var input = provided.FirstOrDefault(a => a.QuestionId == question.Id);

            var answer = new StudentExamAnswer
            {
                AttemptId = attempt.Id,
                QuestionExamQuestionId = question.Id
            };

            if (question.Type == QuestionType.Essay)
            {
                answer.EssayAnswer = input?.EssayAnswer;
                answer.IsCorrect = null;
                answer.AwardedMark = 0;
                pending = true;
            }
            else
            {
                var correctOption = question.Options.FirstOrDefault(o => o.IsCorrect);

                answer.SelectedOptionId = input?.SelectedOptionId;

                var isCorrect = input?.SelectedOptionId != null &&
                                correctOption != null &&
                                input.SelectedOptionId == correctOption.Id;

                answer.IsCorrect = isCorrect;
                answer.AwardedMark = isCorrect ? question.Mark : 0;
                score += answer.AwardedMark;
            }

            answers.Add(answer);
        }

        await _repositoryManager.StudentExamAttemptRepository.AddAnswersAsync(answers);

        attempt.Score = score;
        attempt.Status = StudentExamAttemptStatus.Submitted;
        attempt.SubmittedAt = now;
        attempt.HasPendingManualGrading = pending;

        await _repositoryManager.SaveChangesAsync();

        return Success(new StudentResultDTO
        {
            ExamId = attempt.QuestionExamId,
            ExamName = attempt.QuestionExam.Name,
            Score = attempt.Score,
            TotalMark = attempt.TotalMark,
            SubmittedAt = attempt.SubmittedAt,
            HasPendingManualGrading = attempt.HasPendingManualGrading,
            Status = "finished"
        }, "تم تسليم الامتحان بنجاح");
    }

    public async Task<Response<string>> Handle(
        ReportExamViolationCommand request,
        CancellationToken cancellationToken)
    {
        var student = await GetCurrentStudentAsync(cancellationToken);

        if (student == null)
            return NotFound<string>("لا يوجد طالب مرتبط بهذا الحساب");

        var attempt = await _repositoryManager.StudentExamAttemptRepository
            .GetTableTracking()
            .FirstOrDefaultAsync(a =>
                a.Id == request.AttemptId && a.StudentId == student.Id,
                cancellationToken);

        if (attempt == null)
            return NotFound<string>("المحاولة غير موجودة");

        if (attempt.Status == StudentExamAttemptStatus.Submitted)
            return BadRequest<string>("انتهت هذه المحاولة");

        var type = ExamViolationCatalog.Normalize(request.Type);

        if (type == "unknown")
            return BadRequest<string>("نوع المخالفة غير معروف");

        var log = ExamViolationCatalog.ParseLog(attempt.ViolationLog);
        log[type] = log.TryGetValue(type, out var current) ? current + 1 : 1;
        attempt.ViolationLog = ExamViolationCatalog.SerializeLog(log);
        attempt.ViolationCount = log.Values.Sum();
        attempt.ViolationTimeline = ExamViolationCatalog.AppendTimeline(
            attempt.ViolationTimeline, type, DateTime.Now);

        await _repositoryManager.SaveChangesAsync();

        return Success(string.Empty, "تم تسجيل المخالفة");
    }

    public async Task<Response<string>> Handle(
        MarkNotificationReadCommand request,
        CancellationToken cancellationToken)
    {
        var userId = (await _mediator.Send(new GetUserIdQuery(), cancellationToken)).Data;

        var notification = await _repositoryManager.NotificationRepository
            .GetTableTracking()
            .FirstOrDefaultAsync(x => x.Id == request.Id && x.UserId == userId, cancellationToken);

        if (notification == null)
            return NotFound<string>("الإشعار غير موجود");

        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;

        await _repositoryManager.SaveChangesAsync();

        return Success<string>(null, "تم تعليم الإشعار كمقروء");
    }

    public async Task<Response<string>> Handle(
        MarkAllNotificationsReadCommand request,
        CancellationToken cancellationToken)
    {
        var userId = (await _mediator.Send(new GetUserIdQuery(), cancellationToken)).Data;

        var notifications = await _repositoryManager.NotificationRepository
            .GetTableTracking()
            .Where(x => x.UserId == userId && !x.IsRead)
            .ToListAsync(cancellationToken);

        foreach (var notification in notifications)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
        }

        await _repositoryManager.SaveChangesAsync();

        return Success<string>(null, "تم تعليم كل الإشعارات كمقروءة");
    }

    #endregion

    #region Helpers

    private async Task<Student?> GetCurrentStudentAsync(CancellationToken cancellationToken)
    {
        var userId = (await _mediator.Send(new GetUserIdQuery(), cancellationToken)).Data;

        return await _repositoryManager.StudentRepository
            .GetTableNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
    }

    private static StudentAttemptDTO BuildAttemptDto(StudentExamAttempt attempt, DateTime now)
    {
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
            ViolationCount = attempt.ViolationCount,
            Questions = ExamShuffleHelper
                .OrderQuestions(
                    attempt.QuestionExam.Questions,
                    attempt.QuestionExamId,
                    attempt.StudentId,
                    attempt.QuestionExam.ShuffleQuestions)
                .Select((q, index) => new StudentAttemptQuestionDTO
                {
                    Id = q.Id,
                    Type = (int)q.Type,
                    TypeName = GetTypeName(q.Type),
                    Text = q.Text,
                    ImageName = q.ImageName,
                    Mark = q.Mark,
                    Order = index + 1,
                    Options = ExamShuffleHelper
                        .OrderOptions(
                            q.Options,
                            attempt.QuestionExamId,
                            attempt.StudentId,
                            q.Id,
                            attempt.QuestionExam.ShuffleOptions)
                        .Select((o, optionIndex) => new StudentAttemptOptionDTO
                        {
                            Id = o.Id,
                            Order = optionIndex + 1,
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

    #endregion
}
