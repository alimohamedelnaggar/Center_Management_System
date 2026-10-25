
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Reports.Queries.Handlers;

public class GetStudentGradesReportHandler :
    ResponseHandler,
    IRequestHandler<GetStudentGradesReportQuery, Response<StudentGradesReportDto>>
{
    #region Fields

    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;

    #endregion

    #region Constructors

    public GetStudentGradesReportHandler(
        IRepositoryManager repositoryManager,
        IUserScopeService scopeService,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
    }

    #endregion

    #region Handle

    public async Task<Response<StudentGradesReportDto>> Handle(
        GetStudentGradesReportQuery request,
        CancellationToken cancellationToken)
    {
        // ==========================================
        // Get Student
        // ==========================================

        var student = await _repositoryManager
            .StudentRepository
            .GetDetailsAsync(request.StudentId);

        if (student is null)
            return NotFound<StudentGradesReportDto>();

        if (!await _scopeService.AllowsStudentAsync(request.StudentId, cancellationToken))
            return Forbidden<StudentGradesReportDto>();


        // ==========================================
        // Get Active Group
        // ==========================================

        var activeGroup = student.StudentGroups
            .FirstOrDefault(sg =>
                sg.IsActive &&
                sg.LeftAt == null)
            ?.Group;


        // ==========================================
        // Get Student Exam Marks
        // ==========================================

        var studentMarks = await _repositoryManager
            .ExamRepository
            .GetStudentExamReportAsync(request.StudentId);


        // ==========================================
        // Filter By Group
        // ==========================================

        if (request.GroupId.HasValue)
        {
            studentMarks = studentMarks
                .Where(x =>
                    x.ExamComponent.Exam.GroupId ==
                    request.GroupId.Value)
                .ToList();
        }


        // ==========================================
        // Get Parent Contact Records
        // ==========================================

        var parentContacts = await _repositoryManager
            .StudentExamParentContactRepository
            .GetTableNoTracking()
            .Where(x =>
                x.StudentId == request.StudentId)
            .ToListAsync(cancellationToken);


        // ==========================================
        // Create Lookup
        // ==========================================

        var parentContactLookup = parentContacts
            .GroupBy(x => x.ExamId)
            .ToDictionary(
                g => g.Key,
                g => g.First());


        // ==========================================
        // Build Exams
        // ==========================================

        var exams = new List<ExamRecordDto>();

        foreach (var group in studentMarks
                     .GroupBy(x => x.ExamComponent.ExamId))
        {
            var obtainedMarks = group.Sum(x => x.Mark);

            var totalMarks = group.Sum(
                x => x.ExamComponent.TotalMarks);


            // ==========================================
            // Low Grade
            // ==========================================
            // الطالب مقصر إذا كان ناقص 3 درجات أو أكثر
            //
            // مثال:
            // 20 -> 17 أو أقل = مقصر
            // 20 -> 18 أو أكثر = مش مقصر
            //
            // 10 -> 7 أو أقل = مقصر
            // 10 -> 8 أو أكثر = مش مقصر

            var isLowGrade =
                totalMarks >= 3 &&
                obtainedMarks <= totalMarks - 3;


            // ==========================================
            // Parent Contact
            // ==========================================

            parentContactLookup.TryGetValue(
                group.Key,
                out var parentContact);


            // ==========================================
            // Add Exam
            // ==========================================

            exams.Add(new ExamRecordDto
            {
                ExamId = group.Key,

                ExamName = group
                    .First()
                    .ExamComponent
                    .Exam
                    .Name,

                ExamDate = group
                    .First()
                    .ExamComponent
                    .Exam
                    .ExamDate,

                ObtainedMarks = obtainedMarks,

                TotalMarks = totalMarks,

                Percentage = totalMarks == 0
                    ? 0
                    : Math.Round(
                        (obtainedMarks / totalMarks) * 100,
                        2),

                // ======================================
                // Low Grade Status
                // ======================================

                IsLowGrade = isLowGrade,

                // ======================================
                // Parent Contact Status
                // ======================================
                // لو الطالب مش مقصر:
                // مش مهم هل تم التواصل أم لا
                //
                // لو الطالب مقصر:
                // نعرض حالة التواصل الحقيقية

                IsParentContacted =
                    isLowGrade &&
                    parentContact?.IsContacted == true,

                ParentContactedAt =
                    isLowGrade
                        ? parentContact?.ContactedAt
                        : null,

                // ======================================
                // Components
                // ======================================

                Components = group
                    .Select(x => new ExamComponentReportDto
                    {
                        Type = x.ExamComponent.Type,

                        Mark = x.Mark,

                        TotalMarks =
                            x.ExamComponent.TotalMarks
                    })
                    .ToList()
            });
        }


        // ==========================================
        // Order Exams By Date
        // ==========================================

        exams = exams
            .OrderByDescending(x => x.ExamDate)
            .ToList();


        // ==========================================
        // Calculate Overall Marks
        // ==========================================

        var totalObtainedMarks = exams
            .Sum(x => x.ObtainedMarks);

        var totalMarksAllExams = exams
            .Sum(x => x.TotalMarks);


        var percentage = totalMarksAllExams == 0
            ? 0
            : Math.Round(
                (totalObtainedMarks / totalMarksAllExams) * 100,
                2);


        // ==========================================
        // Create Result
        // ==========================================

        var result = new StudentGradesReportDto
        {
            StudentId = student.Id,

            StudentName = student.FullName,

            GroupName = activeGroup?.Name ?? string.Empty,

            TotalObtainedMarks = totalObtainedMarks,

            TotalMarks = totalMarksAllExams,

            Percentage = percentage,

            Exams = exams
        };


        // ==========================================
        // Return
        // ==========================================

        return Success(result);
    }

    #endregion
}