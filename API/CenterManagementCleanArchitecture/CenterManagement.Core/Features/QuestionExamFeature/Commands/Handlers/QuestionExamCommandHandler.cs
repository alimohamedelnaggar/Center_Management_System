using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Core.Features.NotificationFeature.Dtos;
using CenterManagement.Core.Features.ParentPortalFeature.Services;
using CenterManagement.Core.Features.QuestionExamFeature.Commands.Models;
using CenterManagement.Data.Entities.Notifications;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging;

namespace CenterManagement.Core.Features.QuestionExamFeature.Commands.Handlers;

public class QuestionExamCommandHandler : ResponseHandler,
    IRequestHandler<CreateQuestionExamCommand, Response<Guid>>,
    IRequestHandler<EditQuestionExamCommand, Response<Guid>>,
    IRequestHandler<DeleteQuestionExamCommand, Response<string>>,
    IRequestHandler<PublishQuestionExamResultsCommand, Response<string>>,
    IRequestHandler<GradeQuestionExamAttemptCommand, Response<string>>
{
    #region Fields
    private readonly IRepositoryManager _repositoryManager;
    private readonly IMediator _mediator;
    private readonly INotificationPusher _notificationPusher;
    private readonly IParentNotificationService _parentNotificationService;
    private readonly ILogger<QuestionExamCommandHandler> _logger;
    #endregion

    #region Constructors
    public QuestionExamCommandHandler(
        IRepositoryManager repositoryService,
        IStringLocalizer<SharedResources> localizer,
        IMediator mediator,
        INotificationPusher notificationPusher,
        IParentNotificationService parentNotificationService,
        ILogger<QuestionExamCommandHandler> logger)
        : base(localizer)
    {
        _repositoryManager = repositoryService;
        _mediator = mediator;
        _notificationPusher = notificationPusher;
        _parentNotificationService = parentNotificationService;
        _logger = logger;
    }
    #endregion

    #region Handle Functions

    public async Task<Response<Guid>> Handle(
        CreateQuestionExamCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var validationMessage = await ValidateAsync(
                request.Name,
                request.GroupId,
                request.AcademicYearId,
                request.Mode,
                request.DurationMinutes,
                request.QuestionIds);

            if (validationMessage != null)
                return BadRequest<Guid>(validationMessage);

            var currentUser =
                (await _mediator.Send(new GetUserIdQuery())).Data;

            var sourceQuestions = await LoadSourceQuestionsAsync(
                request.QuestionIds,
                cancellationToken);

            var exam = new QuestionExam
            {
                Name = request.Name.Trim(),
                GroupId = request.GroupId,
                AcademicYearId = request.AcademicYearId,
                Mode = request.Mode,
                ExamDate = request.ExamDate,
                DurationMinutes = request.DurationMinutes,
                ShuffleQuestions = request.ShuffleQuestions,
                ShuffleOptions = request.ShuffleOptions,
                CreatedBy = currentUser
            };

            await _repositoryManager.QuestionExamRepository.AddAsync(exam);

            var examQuestions = BuildExamQuestions(
                exam.Id,
                request.QuestionIds,
                sourceQuestions,
                currentUser);

            await _repositoryManager.QuestionExamRepository
                .AddQuestionsAsync(examQuestions);

            await _repositoryManager.SaveChangesAsync();

            await NotifyStudentsAsync(exam);

            return Success(exam.Id, "تم إنشاء الامتحان بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<Guid>("حدث خطأ أثناء إنشاء الامتحان");
        }
    }

    public async Task<Response<Guid>> Handle(
        EditQuestionExamCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var exam = await _repositoryManager.QuestionExamRepository
                .GetTableTracking()
                .Include(x => x.Questions)
                .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

            if (exam == null)
                return NotFound<Guid>("الامتحان غير موجود");

            var validationMessage = await ValidateAsync(
                request.Name,
                request.GroupId,
                request.AcademicYearId,
                request.Mode,
                request.DurationMinutes,
                request.QuestionIds);

            if (validationMessage != null)
                return BadRequest<Guid>(validationMessage);

            var currentUser =
                (await _mediator.Send(new GetUserIdQuery())).Data;

            var sourceQuestions = await LoadSourceQuestionsAsync(
                request.QuestionIds,
                cancellationToken);

            await using var transaction =
                await _repositoryManager.BeginTransactionAsync();

            try
            {
                exam.Name = request.Name.Trim();
                exam.GroupId = request.GroupId;
                exam.AcademicYearId = request.AcademicYearId;
                exam.Mode = request.Mode;
                exam.ExamDate = request.ExamDate;
                exam.DurationMinutes = request.DurationMinutes;
                exam.ShuffleQuestions = request.ShuffleQuestions;
                exam.ShuffleOptions = request.ShuffleOptions;
                exam.UpdatedBy = currentUser;
                exam.UpdatedAt = DateTime.UtcNow;

                foreach (var question in exam.Questions)
                {
                    foreach (var option in question.Options)
                    {
                        option.IsDeleted = true;
                        option.DeletedAt = DateTime.UtcNow;
                    }

                    question.IsDeleted = true;
                    question.DeletedAt = DateTime.UtcNow;
                }

                await _repositoryManager.SaveChangesAsync();

                var examQuestions = BuildExamQuestions(
                    exam.Id,
                    request.QuestionIds,
                    sourceQuestions,
                    currentUser);

                await _repositoryManager.QuestionExamRepository
                    .AddQuestionsAsync(examQuestions);

                await _repositoryManager.SaveChangesAsync();

                await _repositoryManager.CommitAsync();
            }
            catch
            {
                await _repositoryManager.RollBackAsync();
                throw;
            }

            return Success(exam.Id, "تم تعديل الامتحان بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<Guid>("فشل في تعديل الامتحان");
        }
    }

    public async Task<Response<string>> Handle(
        DeleteQuestionExamCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var exam = await _repositoryManager.QuestionExamRepository
                .GetTableTracking()
                .Include(x => x.Questions)
                .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

            if (exam == null)
                return NotFound<string>("الامتحان غير موجود");

            var currentUser =
                (await _mediator.Send(new GetUserIdQuery())).Data;

            foreach (var question in exam.Questions)
            {
                foreach (var option in question.Options)
                {
                    option.IsDeleted = true;
                    option.DeletedAt = DateTime.UtcNow;
                }

                question.IsDeleted = true;
                question.DeletedAt = DateTime.UtcNow;
            }

            exam.IsDeleted = true;
            exam.DeletedBy = currentUser;
            exam.DeletedAt = DateTime.UtcNow;

            await _repositoryManager.SaveChangesAsync();

            return Deleted<string>("تم حذف الامتحان بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ أثناء حذف الامتحان");
        }
    }

    public async Task<Response<string>> Handle(
        PublishQuestionExamResultsCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var exam = await _repositoryManager.QuestionExamRepository
                .GetTableTracking()
                .FirstOrDefaultAsync(x => x.Id == request.ExamId, cancellationToken);

            if (exam == null)
                return NotFound<string>("الامتحان غير موجود");

            if (exam.Mode != QuestionExamMode.Electronic)
                return BadRequest<string>("نشر النتائج متاح للامتحانات الإلكترونية فقط");

            if (request.Publish == exam.IsResultsPublished)
                return Success(
                    string.Empty,
                    request.Publish
                        ? "النتائج منشورة بالفعل"
                        : "النتائج غير منشورة بالفعل");

            exam.IsResultsPublished = request.Publish;
            exam.PublishedAt = request.Publish ? DateTime.UtcNow : null;
            exam.UpdatedAt = DateTime.UtcNow;

            await _repositoryManager.SaveChangesAsync();

            if (request.Publish)
            {
                await NotifyResultsPublishedAsync(exam);
                await NotifyParentsOfResultsAsync(exam);
            }

            return Success(
                string.Empty,
                request.Publish ? "تم نشر النتائج للطلاب" : "تم إلغاء نشر النتائج");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ أثناء تحديث حالة نشر النتائج");
        }
    }

    public async Task<Response<string>> Handle(
        GradeQuestionExamAttemptCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var attempt = await _repositoryManager.StudentExamAttemptRepository
                .GetTableTracking()
                .Include(a => a.Answers)
                .Include(a => a.QuestionExam)
                    .ThenInclude(e => e.Questions)
                .FirstOrDefaultAsync(a => a.Id == request.AttemptId, cancellationToken);

            if (attempt == null)
                return NotFound<string>("المحاولة غير موجودة");

            if (attempt.Status != StudentExamAttemptStatus.Submitted)
                return BadRequest<string>("لا يمكن تصحيح محاولة لم تُسلَّم بعد");

            var essayQuestions = attempt.QuestionExam.Questions
                .Where(q => q.Type == QuestionType.Essay)
                .ToDictionary(q => q.Id);

            if (essayQuestions.Count == 0)
                return BadRequest<string>("لا توجد أسئلة مقالية في هذا الامتحان");

            foreach (var grade in request.Grades)
            {
                var answer = attempt.Answers
                    .FirstOrDefault(a => a.Id == grade.AnswerId);

                if (answer == null)
                    continue;

                if (!essayQuestions.TryGetValue(answer.QuestionExamQuestionId, out var question))
                    continue;

                var mark = Math.Clamp(grade.AwardedMark, 0, question.Mark);

                answer.AwardedMark = mark;
                answer.IsCorrect = mark >= question.Mark;
            }

            attempt.Score = attempt.Answers.Sum(a => a.AwardedMark);
            attempt.HasPendingManualGrading = attempt.Answers.Any(a =>
                essayQuestions.ContainsKey(a.QuestionExamQuestionId) &&
                a.IsCorrect == null);
            attempt.UpdatedAt = DateTime.UtcNow;

            await _repositoryManager.SaveChangesAsync();

            return Success(string.Empty, "تم حفظ الدرجات");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ أثناء حفظ الدرجات");
        }
    }

    #endregion

    #region Helpers

    private async Task NotifyResultsPublishedAsync(QuestionExam exam)
    {
        try
        {
            var userIds = await _repositoryManager.StudentGroupRepository
                .GetTableNoTracking()
                .Where(sg => sg.GroupId == exam.GroupId && sg.IsActive && sg.LeftAt == null)
                .Select(sg => sg.Student.UserId)
                .Where(id => id != null)
                .Select(id => id!.Value)
                .Distinct()
                .ToListAsync();

            if (userIds.Count == 0)
                return;

            const string title = "نشر نتائج امتحان";
            var body = $"تم نشر نتائج امتحان: {exam.Name}. يمكنك الاطلاع على درجتك ومراجعة الامتحان الآن.";

            var notifications = userIds.Select(uid => new Notification
            {
                UserId = uid,
                Title = title,
                Body = body,
                Type = "QuestionExamResultsPublished",
                ReferenceId = exam.Id,
                ReferenceType = nameof(QuestionExam)
            }).ToList();

            await _repositoryManager.NotificationRepository.AddRangeAsync(notifications);
            await _repositoryManager.SaveChangesAsync();

            await _notificationPusher.PushAsync(userIds, new NotificationDTO
            {
                Title = title,
                Body = body,
                Type = "QuestionExamResultsPublished",
                ReferenceId = exam.Id,
                ReferenceType = nameof(QuestionExam),
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }
        catch
        {
            // Notification failure must never break publishing.
        }
    }

    /// <summary>
    /// Notifies the parents of every active member of the exam's group that the
    /// results were published. Kept separate from the student fan-out so it also
    /// runs for students that have no login account. Each student is isolated:
    /// one failing notification never stops the others and never breaks the
    /// publish that already succeeded.
    /// </summary>
    private async Task NotifyParentsOfResultsAsync(QuestionExam exam)
    {
        List<Guid> studentIds;
        try
        {
            studentIds = await _repositoryManager.StudentGroupRepository
                .GetTableNoTracking()
                .Where(sg => sg.GroupId == exam.GroupId && sg.IsActive && sg.LeftAt == null)
                .Select(sg => sg.StudentId)
                .Distinct()
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load students for parent result notifications (exam {ExamId}).", exam.Id);
            return;
        }

        if (studentIds.Count == 0)
            return;

        const string title = "نشر نتائج امتحان";
        var body = $"تم نشر نتائج امتحان: {exam.Name}.";

        foreach (var studentId in studentIds)
        {
            try
            {
                await _parentNotificationService.NotifyStudentParentsAsync(
                    studentId,
                    ParentNotificationTypes.ExamResults,
                    ModuleKeys.OnlineExams,
                    exam.Id,
                    nameof(QuestionExam),
                    title,
                    body);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to send a parent result notification for student {StudentId}.",
                    studentId);
            }
        }
    }

    private async Task NotifyStudentsAsync(QuestionExam exam)
    {
        if (exam.Mode != QuestionExamMode.Electronic)
            return;

        try
        {
            var userIds = await _repositoryManager.StudentGroupRepository
                .GetTableNoTracking()
                .Where(sg => sg.GroupId == exam.GroupId && sg.IsActive && sg.LeftAt == null)
                .Select(sg => sg.Student.UserId)
                .Where(id => id != null)
                .Select(id => id!.Value)
                .Distinct()
                .ToListAsync();

            if (userIds.Count == 0)
                return;

            const string title = "امتحان إلكتروني جديد";
            var body = $"تم إضافة امتحان إلكتروني: {exam.Name} - بتاريخ {exam.ExamDate:yyyy/MM/dd HH:mm}";

            var notifications = userIds.Select(uid => new Notification
            {
                UserId = uid,
                Title = title,
                Body = body,
                Type = "QuestionExamCreated",
                ReferenceId = exam.Id,
                ReferenceType = nameof(QuestionExam)
            }).ToList();

            await _repositoryManager.NotificationRepository.AddRangeAsync(notifications);
            await _repositoryManager.SaveChangesAsync();

            await _notificationPusher.PushAsync(userIds, new NotificationDTO
            {
                Title = title,
                Body = body,
                Type = "QuestionExamCreated",
                ReferenceId = exam.Id,
                ReferenceType = nameof(QuestionExam),
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }
        catch
        {
            // Notification failure must never break exam creation.
        }
    }

    private async Task<string?> ValidateAsync(
        string? name,
        Guid groupId,
        Guid academicYearId,
        QuestionExamMode mode,
        int durationMinutes,
        List<Guid> questionIds)
    {
        if (string.IsNullOrWhiteSpace(name))
            return "اكتب اسم الامتحان";

        if (groupId == Guid.Empty)
            return "اختر المجموعة";

        if (academicYearId == Guid.Empty)
            return "اختر السنة الدراسية";

        if (questionIds == null || questionIds.Count == 0)
            return "أضف أسئلة الامتحان";

        if (mode == QuestionExamMode.Electronic && durationMinutes <= 0)
            return "حدد مدة الامتحان بالدقائق";

        var group = await _repositoryManager.GroupRepository
            .GetByIdAsync(groupId);

        if (group == null)
            return "المجموعة غير موجودة";

        return null;
    }

    private async Task<List<Question>> LoadSourceQuestionsAsync(
        List<Guid> questionIds,
        CancellationToken cancellationToken)
    {
        var ids = questionIds.Distinct().ToList();

        return await _repositoryManager.QuestionRepository
            .GetTableNoTracking()
            .Where(q => ids.Contains(q.Id))
            .Include(q => q.Options)
            .ToListAsync(cancellationToken);
    }

    private static List<QuestionExamQuestion> BuildExamQuestions(
        Guid examId,
        List<Guid> questionIds,
        List<Question> sourceQuestions,
        Guid? currentUser)
    {
        var examQuestions = new List<QuestionExamQuestion>();
        var order = 1;

        foreach (var id in questionIds)
        {
            var source = sourceQuestions.FirstOrDefault(x => x.Id == id);
            if (source == null)
                continue;

            var examQuestion = new QuestionExamQuestion
            {
                QuestionExamId = examId,
                SourceQuestionId = source.Id,
                Type = source.Type,
                Text = source.Text,
                ImageName = source.ImageName,
                Mark = source.Mark,
                Order = order++,
                CreatedBy = currentUser
            };

            var optionOrder = 1;

            foreach (var option in source.Options
                .Where(o => !o.IsDeleted)
                .OrderBy(o => o.Order))
            {
                examQuestion.Options.Add(new QuestionExamQuestionOption
                {
                    QuestionExamQuestionId = examQuestion.Id,
                    Order = optionOrder++,
                    Text = option.Text,
                    IsCorrect = option.IsCorrect
                });
            }

            examQuestions.Add(examQuestion);
        }

        return examQuestions;
    }

    #endregion
}
