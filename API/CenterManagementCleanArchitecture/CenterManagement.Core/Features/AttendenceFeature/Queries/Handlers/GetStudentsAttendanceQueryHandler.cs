using CenterManagement.Core.Features.AttendenceFeature.Queries.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.AttendenceFeature.Queries.Handlers;

public class GetStudentsAttendanceQueryHandler
    : ResponseHandler,
      IRequestHandler<GetStudentsAttendanceQuery, Response<List<StudentAttendenceDTO>>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;

    public GetStudentsAttendanceQueryHandler(IRepositoryManager repositoryManager,
         IUserScopeService scopeService,
         IStringLocalizer<SharedResources> stringLocalizer) : base(stringLocalizer)

    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
    }

    //public async Task<Response<List<StudentAttendenceDTO>>> Handle(GetStudentsAttendanceQuery request, CancellationToken cancellationToken)
    //{
    //    try
    //    {

    //        var students = await _repositoryManager
    //            .StudentRepository
    //            .GetTableNoTracking()
    //            .Where(x =>
    //                x.IsActive && x.GroupId == request.GroupId)
    //            .Select(student => new StudentAttendenceDTO
    //            {
    //                Id = student.Id,
    //                FullName = student.FullName,
    //                Phone = student.PhoneNumber,
    //                GroupId = student.GroupId,
    //                Status = student.Attendances
    //                    .Where(a => a.SessionId == request.SessionId)
    //                    .Select(a => (AttendanceStatus?)a.Status)
    //                    .FirstOrDefault()
    //            })
    //            .OrderBy(x => x.FullName)
    //            .ToListAsync(cancellationToken);

    //        return Success(students, "تم جلب بيانات الحضور بنجاح.");

    //    }
    //    catch (Exception)
    //    {
    //        return BadRequest<List<StudentAttendenceDTO>>("فشل في جلب بيانات الحضور.");

    //        throw;
    //    }
    //}


    public async Task<Response<List<StudentAttendenceDTO>>> Handle(GetStudentsAttendanceQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var scope = await _scopeService.ResolveAsync(cancellationToken);

            if (!scope.Allows(request.GroupId))
                return NotFound<List<StudentAttendenceDTO>>("المجموعة غير موجودة.");

            var students = await _repositoryManager
                .StudentRepository
                .GetTableNoTracking()
                .Where(s => s.IsActive && s.StudentGroups.Any(sg => sg.GroupId == request.GroupId && sg.IsActive && sg.LeftAt == null))
                .Select(student => new StudentAttendenceDTO
                {
                    Id = student.Id,
                    FullName = student.FullName,
                    Phone = student.PhoneNumber,
                    ParentPhoneNumber = student.ParentPhoneNumber,
                    GroupId = request.GroupId,
                    Status = student.Attendances
                        .Where(a => a.SessionId == request.SessionId)
                        .Select(a => (AttendanceStatus?)a.Status)
                        .FirstOrDefault()
                })
                .OrderBy(x => x.FullName)
                .ToListAsync(cancellationToken);

            return Success(students, "تم جلب بيانات الحضور بنجاح.");
        }
        catch (Exception)
        {
            return BadRequest<List<StudentAttendenceDTO>>("فشل في جلب بيانات الحضور.");
        }
    }


}