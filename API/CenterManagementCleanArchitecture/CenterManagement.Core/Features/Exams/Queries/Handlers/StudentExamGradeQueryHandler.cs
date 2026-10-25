using CenterManagement.Core.Features.Exams.Queries.Models;
using CenterManagement.Core.Features.Exams.Queries.Results;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Exams.Queries.Handlers;

public class StudentExamGradeQueryHandler :
    ResponseHandler,
    IRequestHandler<GetExamGradesQuery, Response<List<StudentExamGradeResponse>>>
{
    #region Fields

    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;

    #endregion

    #region Constructors

    public StudentExamGradeQueryHandler(
        IRepositoryManager repositoryManager,
        IUserScopeService scopeService,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
    }

    #endregion

    #region Handle

    public async Task<Response<List<StudentExamGradeResponse>>> Handle(
        GetExamGradesQuery request,
        CancellationToken cancellationToken)
    {
        // =========================================================
        // Scope
        // =========================================================
        // A teacher (or an assistant linked to a teacher) only sees his own
        // groups. The group-scoped grades, including the parent phone numbers
        // exposed below, must never leak another teacher's students.

        var scope = await _scopeService.ResolveAsync(cancellationToken);

        if (!scope.Allows(request.GroupId))
            return NotFound<List<StudentExamGradeResponse>>("المجموعة غير موجودة.");

        // =========================================================
        // Get Students Exam Grades
        // =========================================================

        var result = await _repositoryManager
            .StudentExamComponentRepository
            .GetTableNoTracking()
            .Include(x => x.Student)
            .Include(x => x.ExamComponent)
                .ThenInclude(ec => ec.Exam)
            .Where(x =>
                x.ExamComponent.Exam.Id == request.ExamId &&
                x.ExamComponent.Exam.GroupId == request.GroupId &&
                x.ExamComponent.Exam.SessionId == request.SessionId&& x.Student!.StudentGroups.Any(sg =>
        sg.GroupId == request.GroupId &&
        sg.IsActive &&
        sg.LeftAt == null))
            .GroupBy(x => new
            {
                x.StudentId,
                x.Student!.FullName,
                x.Student.PhoneNumber,
                x.Student.ParentPhoneNumber
            })
            .Select(g => new StudentExamGradeResponse
            {
                StudentId = g.Key.StudentId,
                StudentName = g.Key.FullName,
                StudentPhone = g.Key.PhoneNumber,
                ParentPhoneNumber = g.Key.ParentPhoneNumber,

                ExamTypes = g.Select(x => new ExamTypeDTO
                {
                    Type = x.ExamComponent.Type,
                    TotalMark = x.ExamComponent.TotalMarks
                }).ToList(),

                ExamGrades = g.Select(x => new ExamGradeDTO
                {
                    Type = x.ExamComponent.Type,
                    Mark = x.Mark
                }).ToList()
            })
            .ToListAsync(cancellationToken);

        // =========================================================
        // Get Parent Contact Status
        // =========================================================

        var studentIds = result
            .Where(x => x.StudentId.HasValue)
            .Select(x => x.StudentId!.Value)
            .ToList();

        var contactedStudents = await _repositoryManager
            .StudentExamParentContactRepository
            .GetTableNoTracking()
            .Where(x =>
                x.ExamId == request.ExamId &&
                studentIds.Contains(x.StudentId) &&
                x.IsContacted)
            .Select(x => x.StudentId)
            .ToListAsync(cancellationToken);

        var contactedStudentIds = contactedStudents.ToHashSet();

        // =========================================================
        // Calculate Student Status
        // =========================================================

        result = result
            .Select(student =>
            {
                // =================================================
                // Absent
                // =================================================
                // -1 means the student was absent.
                // If at least one component has -1,
                // the student is considered absent.
                // =================================================

                student.IsAbsent = student.ExamGrades
                    .Any(x => x.Mark == -1);

                // =================================================
                // Low Grade
                // =================================================
                // Each exam component is evaluated separately.
                //
                // Example:
                //
                // Paragraph = 10
                // Student   = 7.5
                // Missing   = 2.5 -> NOT low grade
                //
                // Recitation = 7
                // Student    = 4
                // Missing    = 3 -> LOW GRADE
                //
                // A student is low grade if ANY component
                // is missing 3 marks or more.
                // =================================================

                student.IsLowGrade = student.ExamTypes.Any(examType =>
                {
                    var grade = student.ExamGrades
                        .FirstOrDefault(x => x.Type == examType.Type);

                    // No grade for this component
                    if (grade is null)
                        return false;

                    // Absent does not mean low grade
                    if (grade.Mark == -1)
                        return false;

                    // Ignore any other negative invalid value
                    if (grade.Mark < 0)
                        return false;

                    var missingMarks =
                        examType.TotalMark - grade.Mark;

                    return missingMarks >= 3;
                });

                // =================================================
                // Parent Contact
                // =================================================

                student.IsParentContacted =
                    student.StudentId.HasValue &&
                    contactedStudentIds.Contains(student.StudentId.Value);

                // =================================================
                // Calculate Total Student Marks
                // =================================================
                // Used only for sorting.
                // Absent (-1) is ignored.
                // =================================================

                var studentMarks = student.ExamGrades
                    .Where(x => x.Mark >= 0)
                    .Sum(x => x.Mark);

                return new
                {
                    Student = student,
                    StudentMarks = studentMarks
                };
            })

            // =====================================================
            // Sorting
            // =====================================================
            // Low-grade students first,
            // then by total marks ascending.
            // =====================================================

            .OrderByDescending(x => x.Student.IsLowGrade)
            .ThenBy(x => x.StudentMarks)

            .Select(x => x.Student)
            .ToList();

        return Success(result);
    }

    #endregion
}