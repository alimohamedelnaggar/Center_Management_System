using CenterManagement.Core.Features.Exams.Commands.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Exams.Commands.Handlers;

public sealed class EditExamCommandHandler : ResponseHandler,
    IRequestHandler<EditExamCommand, Response<string>>
{
    private readonly IRepositoryManager _repositoryManager;

    public EditExamCommandHandler(IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> stringLocalizer) : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
    }

    public async Task<Response<string>> Handle(EditExamCommand request, CancellationToken cancellationToken)
    {
        try
        {

            var exam = await _repositoryManager.ExamRepository
                .GetTableTracking()
                .Include(x => x.ExamComponents)
                    .ThenInclude(x => x.StudentMarks)
                .FirstOrDefaultAsync(x =>
                    x.Id == request.ExamId &&
                    x.GroupId == request.GroupId &&
                    x.SessionId == request.SessionId,
                    cancellationToken);

            if (exam is null)
                return NotFound<string>("الامتحان غير موجود");

            // Update total marks of components
            foreach (var component in exam.ExamComponents)
            {
                var dto = request.Components
                    .FirstOrDefault(x => x.Type == component.Type);

                if (dto is not null)
                {
                    component.TotalMarks = dto.TotalMarks;
                }
            }

            // Update student marks
            foreach (var student in request.Students)
            {
                foreach (var mark in student.Marks)
                {
                    var component = exam.ExamComponents
                        .FirstOrDefault(x => x.Type == mark.Type);

                    if (component is null)
                        continue;

                    var studentMark = component.StudentMarks
                        .FirstOrDefault(x => x.StudentId == student.StudentId);

                    if (studentMark is not null)
                    {
                        studentMark.Mark = mark.Mark;
                    }
                }
            }

            await _repositoryManager.SaveChangesAsync();

            return Success("تم تعديل الدرجات بنجاح");

        }
        catch (Exception)
        {
            return BadRequest<string>("فشل في تعديل الدرجات ");

        }
    }
}