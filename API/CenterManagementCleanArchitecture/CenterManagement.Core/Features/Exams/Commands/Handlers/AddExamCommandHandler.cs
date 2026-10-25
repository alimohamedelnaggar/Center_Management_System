using CenterManagement.Core.Features.Exams.Commands.Models;
using CenterManagement.Data.Entities.Exams;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Exams.Commands.Handlers;

public class DeleteExamCommandHandler : ResponseHandler,
    IRequestHandler<DeleteExamCommand, Response<string>>
{
    #region Fields
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly IRepositoryManager _repositoryManager;
    private readonly IExamNotification _examNotification;
    #endregion

    #region Constructors
    public DeleteExamCommandHandler(IStringLocalizer<SharedResources> stringLocalizer,
        IRepositoryManager repositoryManager,
        IExamNotification examNotification) : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _repositoryManager = repositoryManager;
        _examNotification = examNotification;
    }

    public async Task<Response<string>> Handle(DeleteExamCommand request, CancellationToken cancellationToken)
    {
        var exam = await _repositoryManager.ExamRepository.GetByIdAsync(request.Id);

        if (exam is null)
            return NotFound<string>(_stringLocalizer[SharedResourcesKeys.NotFound]);

        await _repositoryManager.ExamRepository.DeleteExamWithResultsAsync(request.Id,cancellationToken);

        await _repositoryManager.SaveChangesAsync();

        await _examNotification.ExamDeleted(exam.Id);

        return Deleted<string>("تم  حذف الامتاحن بنجاح");

    }
    #endregion
}


public class AddExamCommandHandler : ResponseHandler,
    IRequestHandler<AddExamCommand, Response<string>>
{
    #region Fields
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly IRepositoryManager _repositoryManager;
    private readonly IExamNotification _examNotification;
    #endregion

    #region Constructors
    public AddExamCommandHandler(IStringLocalizer<SharedResources> stringLocalizer,
        IRepositoryManager repositoryManager,
        IExamNotification examNotification) : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _repositoryManager = repositoryManager;
        _examNotification = examNotification;
    }
    #endregion

    public async Task<Response<string>> Handle(AddExamCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var group = await _repositoryManager.GroupRepository
            .GetByIdAsync(request.GroupId);

            if (group is null)
                return NotFound<string>("المجموعة غير موجودة.");

            var session = await _repositoryManager.SessionRepository
                .GetByIdAsync(request.SessionId);

            if (session is null)
                return NotFound<string>("الحصة غير موجودة.");

            if (session.GroupId != request.GroupId)
                return BadRequest<string>("الحصة لا تنتمي إلى هذه المجموعة.");

            var exam = new Exam
            {
                Name = request.Name,
                GroupId = request.GroupId,
                SessionId = request.SessionId,
                ExamDate = request.ExamDate
            };

            // save type of exams in database
            foreach (var component in request.Components)
            {
                exam.ExamComponents.Add(new ExamComponent
                {

                    Type = component.Type,
                    TotalMarks = component.TotalMarks
                });
            }

            var componentDictionary = exam.ExamComponents.ToDictionary(x => x.Type);

            //save student marks
            foreach (var student in request.Students)
            {
                var studentTypes = student.Marks
                    .Select(x => x.Type)
                    .ToHashSet();

                var requiredTypes = request.Components
                    .Select(x => x.Type)
                    .ToHashSet();

                if (!requiredTypes.SetEquals(studentTypes))
                {
                    return BadRequest<string>(
                        "يجب إدخال جميع درجات الطالب.");
                }

                var examDate = DateOnly.FromDateTime(request.ExamDate);

                var attendance = await _repositoryManager.AttendanceRepository
                    .GetStudentAttendanceForSessionAsync(
                        student.StudentId,
                        request.SessionId,
                        examDate,
                        cancellationToken);

                Console.WriteLine(
                    $"Student: {student.StudentId} | " +
                    $"Session: {request.SessionId} | " +
                    $"Attendance Status: {attendance?.Status.ToString() ?? "NULL"}"
                );

                var isAbsent = attendance?.Status == AttendanceStatus.Absent;

                

                foreach (var mark in student.Marks)
                {
                    if (!componentDictionary.TryGetValue(mark.Type, out var component))
                    {
                        return BadRequest<string>(
                            $"نوع التقييم ({mark.Type}) غير موجود.");
                    }

                    if (mark.Mark > component.TotalMarks)
                    {
                        return BadRequest<string>(
                            $"درجة الطالب في ({component.Type}) أكبر من الدرجة الكلية.");
                    }

                    component.StudentMarks.Add(new StudentExamComponent
                    {
                        Id = Guid.NewGuid(),
                        StudentId = student.StudentId,
                        Mark = isAbsent ? -1 : mark.Mark
                    });
                }
            }

            await _repositoryManager.ExamRepository.AddAsync(exam);
            await _repositoryManager.SaveChangesAsync();

            await _examNotification.ExamAdded(exam);

            return Success(exam.Id.ToString(), "تم إضافة الامتحان ودرجات الطلاب بنجاح.");

        }
        catch (Exception)
        {
            return BadRequest<string>("فشل في إضافة الامتحان ودرجات الطلاب ");

        }
    }

}