using CenterManagement.Core.Features.UsersFeature.Students.Queries.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.UsersFeature.Students.Queries.Handlers;

public class StudentQueryHandler :
    ResponseHandler,
    IRequestHandler<GetStudentStatsQuery, Response<StudentStatsResult>>
{
    private readonly IRepositoryManager _repositoryManager;

    public StudentQueryHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _repositoryManager = repositoryManager;
    }

    public async Task<Response<StudentStatsResult>> Handle(GetStudentStatsQuery request, CancellationToken cancellationToken)
    {
        var studentsTask =
           await _repositoryManager.StudentRepository.GetStudentStatsAsync();

        if (studentsTask is null)
            return BadRequest<StudentStatsResult>("فشل في جلب احصائيات الطلبة");

        return Success(studentsTask, "تم ارجاع الاحصائيات بنجاح");
    }
}