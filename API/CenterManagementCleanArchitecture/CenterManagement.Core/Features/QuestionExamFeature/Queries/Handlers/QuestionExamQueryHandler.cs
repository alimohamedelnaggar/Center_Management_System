using CenterManagement.Core.Common;
using CenterManagement.Core.Features.QuestionExamFeature.Dtos;
using CenterManagement.Core.Features.QuestionExamFeature.Queries.Models;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.QuestionExamFeature.Queries.Handlers;

public class QuestionExamQueryHandler : ResponseHandler,
    IRequestHandler<GetQuestionExamsPaginatedQuery, Response<PaginatedResult<QuestionExamDTO>>>,
    IRequestHandler<GetQuestionExamByIdQuery, Response<QuestionExamDetailDTO>>,
    IRequestHandler<GetQuestionExamResultsQuery, Response<List<QuestionExamStudentResultDTO>>>,
    IRequestHandler<GetQuestionExamAttemptDetailQuery, Response<QuestionExamAttemptDetailDTO>>
{
    #region Fields
    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;
    #endregion

    #region Constructors
    public QuestionExamQueryHandler(
        IRepositoryManager repositoryManager,
        IUserScopeService scopeService,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
    }
    #endregion

    #region Handle Functions

    public async Task<Response<PaginatedResult<QuestionExamDTO>>> Handle(
        GetQuestionExamsPaginatedQuery request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        if (request.GroupId.HasValue && !scope.Allows(request.GroupId.Value))
            return NotFound<PaginatedResult<QuestionExamDTO>>("المجموعة غير موجودة.");

        var query = _repositoryManager.QuestionExamRepository
            .GetTableNoTracking()
            .ScopeToUser(scope)
            .AsQueryable();

        if (request.GroupId.HasValue)
            query = query.Where(x => x.GroupId == request.GroupId.Value);

        if (request.AcademicYearId.HasValue)
            query = query.Where(x =>
                x.AcademicYearId == request.AcademicYearId.Value);

        if (request.Mode.HasValue)
            query = query.Where(x => x.Mode == request.Mode.Value);

        if (request.IsPublished.HasValue)
            query = query.Where(x =>
                x.IsResultsPublished == request.IsPublished.Value);

        if (request.From.HasValue)
            query = query.Where(x => x.ExamDate >= request.From.Value);

        if (request.To.HasValue)
            query = query.Where(x =>
                x.ExamDate < request.To.Value.Date.AddDays(1));

        if (!string.IsNullOrWhiteSpace(request.Search))
            query = query.Where(x => x.Name.Contains(request.Search));

        var totalCount = await query.CountAsync(cancellationToken);

        var exams = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new QuestionExamDTO
            {
                Id = x.Id,
                Name = x.Name,
                GroupId = x.GroupId,
                GroupName = x.Group.Name,
                AcademicYearId = x.AcademicYearId,
                AcademicYearName = x.AcademicYear.Name,
                Mode = (int)x.Mode,
                ModeName = x.Mode == QuestionExamMode.Paper ? "ورقي" : "إلكتروني",
                ExamDate = x.ExamDate,
                DurationMinutes = x.DurationMinutes,
                QuestionsCount = x.Questions.Count(),
                TotalMarks = x.Questions.Sum(q => (decimal?)q.Mark) ?? 0,
                IsResultsPublished = x.IsResultsPublished,
                ShuffleQuestions = x.ShuffleQuestions,
                ShuffleOptions = x.ShuffleOptions
            })
            .ToListAsync(cancellationToken);

        var result = PaginatedResult<QuestionExamDTO>.Success(
            exams,
            totalCount,
            request.PageNumber,
            request.PageSize);

        return Success(result);
    }

    public async Task<Response<QuestionExamDetailDTO>> Handle(
        GetQuestionExamByIdQuery request,
        CancellationToken cancellationToken)
    {
        var exam = await _repositoryManager.QuestionExamRepository
            .GetTableNoTracking()
            .Include(x => x.Group)
            .Include(x => x.AcademicYear)
            .Include(x => x.Questions)
            .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (exam == null)
            return NotFound<QuestionExamDetailDTO>("الامتحان غير موجود");

        var scope = await _scopeService.ResolveAsync(cancellationToken);

        if (!scope.Allows(exam.GroupId))
            return NotFound<QuestionExamDetailDTO>("الامتحان غير موجود");

        var dto = new QuestionExamDetailDTO
        {
            Id = exam.Id,
            Name = exam.Name,
            GroupId = exam.GroupId,
            GroupName = exam.Group?.Name ?? string.Empty,
            AcademicYearId = exam.AcademicYearId,
            AcademicYearName = exam.AcademicYear?.Name ?? string.Empty,
            Mode = (int)exam.Mode,
            ModeName = GetModeName(exam.Mode),
            ExamDate = exam.ExamDate,
            DurationMinutes = exam.DurationMinutes,
            QuestionsCount = exam.Questions.Count,
            TotalMarks = exam.Questions.Sum(q => q.Mark),
            IsResultsPublished = exam.IsResultsPublished,
            ShuffleQuestions = exam.ShuffleQuestions,
            ShuffleOptions = exam.ShuffleOptions,
            Questions = exam.Questions
                .OrderBy(q => q.Order)
                .Select(q => new QuestionExamQuestionDTO
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
                        .Select(o => new QuestionExamQuestionOptionDTO
                        {
                            Id = o.Id,
                            Order = o.Order,
                            Text = o.Text,
                            IsCorrect = o.IsCorrect
                        })
                        .ToList()
                })
                .ToList()
        };

        return Success(dto);
    }

    public async Task<Response<List<QuestionExamStudentResultDTO>>> Handle(
        GetQuestionExamResultsQuery request,
        CancellationToken cancellationToken)
    {
        var exam = await _repositoryManager.QuestionExamRepository
            .GetTableNoTracking()
            .Include(x => x.Questions)
            .FirstOrDefaultAsync(x => x.Id == request.ExamId, cancellationToken);

        if (exam == null)
            return NotFound<List<QuestionExamStudentResultDTO>>("الامتحان غير موجود");

        var scope = await _scopeService.ResolveAsync(cancellationToken);

        if (!scope.Allows(exam.GroupId))
            return NotFound<List<QuestionExamStudentResultDTO>>("الامتحان غير موجود");

        var totalMark = exam.Questions.Sum(q => q.Mark);

        var members = await _repositoryManager.StudentGroupRepository
            .GetTableNoTracking()
            .Include(sg => sg.Student)
            .Where(sg =>
                sg.GroupId == exam.GroupId &&
                sg.IsActive &&
                sg.LeftAt == null)
            .ToListAsync(cancellationToken);

        var attempts = await _repositoryManager.StudentExamAttemptRepository
            .GetTableNoTracking()
            .Where(a => a.QuestionExamId == exam.Id)
            .ToListAsync(cancellationToken);

        var result = members
            .Select(sg =>
            {
                var attempt = attempts.FirstOrDefault(a => a.StudentId == sg.StudentId);

                return new QuestionExamStudentResultDTO
                {
                    StudentId = sg.StudentId,
                    StudentName = sg.Student?.FullName ?? string.Empty,
                    AttemptId = attempt?.Id,
                    Status = attempt == null
                        ? "notstarted"
                        : attempt.Status == StudentExamAttemptStatus.Submitted
                            ? "finished"
                            : "inprogress",
                    Score = attempt?.Score,
                    TotalMark = attempt?.TotalMark ?? totalMark,
                    StartedAt = attempt?.StartedAt,
                    SubmittedAt = attempt?.SubmittedAt,
                    HasPendingManualGrading = attempt?.HasPendingManualGrading ?? false,
                    ViolationCount = attempt?.ViolationCount ?? 0,
                    Violations = BuildViolations(attempt?.ViolationLog, attempt?.ViolationTimeline)
                };
            })
            .OrderBy(x => x.StudentName)
            .ToList();

        return Success(result);
    }

    public async Task<Response<QuestionExamAttemptDetailDTO>> Handle(
        GetQuestionExamAttemptDetailQuery request,
        CancellationToken cancellationToken)
    {
        var attempt = await _repositoryManager.StudentExamAttemptRepository
            .GetTableNoTracking()
            .Include(a => a.Answers)
            .Include(a => a.Student)
            .Include(a => a.QuestionExam)
                .ThenInclude(e => e.Questions)
                    .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(a => a.Id == request.AttemptId, cancellationToken);

        if (attempt == null)
            return NotFound<QuestionExamAttemptDetailDTO>("المحاولة غير موجودة");

        var scope = await _scopeService.ResolveAsync(cancellationToken);

        if (attempt.QuestionExam == null || !scope.Allows(attempt.QuestionExam.GroupId))
            return NotFound<QuestionExamAttemptDetailDTO>("المحاولة غير موجودة");

        var answers = ExamShuffleHelper
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

                return new QuestionExamAttemptAnswerDTO
                {
                    AnswerId = answer?.Id ?? Guid.Empty,
                    QuestionId = q.Id,
                    Order = index + 1,
                    Type = (int)q.Type,
                    TypeName = GetTypeName(q.Type),
                    Text = q.Text,
                    ImageName = q.ImageName,
                    Mark = q.Mark,
                    SelectedOptionId = answer?.SelectedOptionId,
                    EssayAnswer = answer?.EssayAnswer,
                    IsCorrect = answer?.IsCorrect,
                    AwardedMark = answer?.AwardedMark ?? 0,
                    CorrectOptionId = correctOption?.Id,
                    Options = ExamShuffleHelper
                        .OrderOptions(
                            q.Options.Where(o => !o.IsDeleted),
                            attempt.QuestionExamId,
                            attempt.StudentId,
                            q.Id,
                            attempt.QuestionExam.ShuffleOptions)
                        .Select((o, optionIndex) => new QuestionExamQuestionOptionDTO
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

        return Success(new QuestionExamAttemptDetailDTO
        {
            AttemptId = attempt.Id,
            ExamId = attempt.QuestionExamId,
            ExamName = attempt.QuestionExam.Name,
            StudentId = attempt.StudentId,
            StudentName = attempt.Student?.FullName ?? string.Empty,
            Score = attempt.Score,
            TotalMark = attempt.TotalMark,
            HasPendingManualGrading = attempt.HasPendingManualGrading,
            IsResultsPublished = attempt.QuestionExam.IsResultsPublished,
            SubmittedAt = attempt.SubmittedAt,
            Answers = answers
        });
    }

    #endregion

    #region Helpers

    private static string GetModeName(QuestionExamMode mode)
    {
        return mode switch
        {
            QuestionExamMode.Paper => "ورقي",
            QuestionExamMode.Electronic => "إلكتروني",
            _ => "غير محدد"
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

    private static List<QuestionExamViolationDTO> BuildViolations(
        string? logJson,
        string? timelineJson)
    {
        var lastByType = ExamViolationCatalog.ParseTimeline(timelineJson)
            .GroupBy(x => x.Type, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => g.Max(x => x.At),
                StringComparer.OrdinalIgnoreCase);

        return ExamViolationCatalog.ParseLog(logJson)
            .Select(kv => new QuestionExamViolationDTO
            {
                Type = kv.Key,
                Label = ExamViolationCatalog.GetLabel(kv.Key),
                Count = kv.Value,
                LastAt = lastByType.TryGetValue(kv.Key, out var at) ? at : null
            })
            .OrderByDescending(x => x.Count)
            .ToList();
    }

    #endregion
}
