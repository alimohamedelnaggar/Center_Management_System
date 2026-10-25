using CenterManagement.Core.Features.AttendenceFeature.Queries.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.UsersFeature.Students.Queries.Handlers;

public class StudentAttendancePaginatedQueryHandler
    : ResponseHandler,
      IRequestHandler<GetStudentsForTakeAttendenceQuery, Response<PagedResult<StudentAttendenceDTO>>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;

    public StudentAttendancePaginatedQueryHandler(IRepositoryManager repositoryManager,
         IUserScopeService scopeService,
         IStringLocalizer<SharedResources> stringLocalizer) : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
    }

    //public async Task<Response<PagedResult<StudentAttendenceDTO>>> Handle(GetStudentsForTakeAttendenceQuery request, CancellationToken cancellationToken)
    //{
    //    try
    //    {
    //        var query = _repositoryManager
    //          .StudentRepository
    //          .GetTableNoTracking()
    //          .Where(g => g.GroupId == request.GroupId)
    //          .Include(s => s.Group)
    //          .ThenInclude(g => g.Sessions)
    //          .AsQueryable();

    //        // Search
    //        if (!string.IsNullOrWhiteSpace(request.Search))
    //        {
    //            query = query.Where(x =>
    //                x.FullName.Contains(request.Search) ||
    //                x.PhoneNumber.Contains(request.Search));
    //        }
    //        var totalCount = await query.CountAsync(cancellationToken);
    //        var presentCount = await query
    //          .CountAsync(s => s.Attendances.Any(a =>
    //              a.SessionId == request.SessionId &&
    //              a.AttendanceDate == request.AttendanceDate &&
    //              a.Status == AttendanceStatus.Present),
    //              cancellationToken);

    //        var absentCount = await query
    //            .CountAsync(s => s.Attendances.Any(a =>
    //                a.SessionId == request.SessionId &&
    //                a.AttendanceDate == request.AttendanceDate &&
    //                a.Status == AttendanceStatus.Absent),
    //                cancellationToken);

    //        var students = await query
    //            .OrderBy(x => x.FullName)
    //            .Skip((request.PageIndex - 1) * request.PageSize)
    //            .Take(request.PageSize)
    //            .Select(x => new StudentAttendenceDTO
    //            {
    //                Id = x.Id,
    //                FullName = x.FullName,
    //                Phone = x.PhoneNumber,
    //                GroupId = x.GroupId,
    //                Status = x.Attendances
    //                    .Where(a =>
    //                        a.SessionId == request.SessionId &&
    //                        a.AttendanceDate == request.AttendanceDate)
    //                    .Select(a => (AttendanceStatus?)a.Status)
    //                    .FirstOrDefault()
    //            })
    //            .ToListAsync(cancellationToken);

    //        var studentsAbsent = students.Where(s => s.Status == AttendanceStatus.Absent).ToList();

    //        var result = new PagedResult<StudentAttendenceDTO>
    //        {
    //            Items = students,
    //            PageIndex = request.PageIndex,
    //            PageSize = request.PageSize,
    //            TotalCount = totalCount
    //        };
    //        var message = students.Any()
    //            ? "تم جلب طلاب المجموعة بنجاح."
    //            : "لا يوجد طلاب في هذه المجموعة.";

    //        return Success(result, message);

    //    }
    //    catch (Exception)
    //    {

    //        return BadRequest<PagedResult<StudentAttendenceDTO>>("حدث خطأ أثناء جلب طلاب المجموعة.");

    //        throw;
    //    }
    //}

    public async Task<Response<PagedResult<StudentAttendenceDTO>>> Handle(GetStudentsForTakeAttendenceQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var scope = await _scopeService.ResolveAsync(cancellationToken);

            if (!scope.Allows(request.GroupId))
                return NotFound<PagedResult<StudentAttendenceDTO>>("المجموعة غير موجودة.");

            var query = _repositoryManager
                .StudentRepository
                .GetTableNoTracking()
                .Where(s => s.IsActive && s.StudentGroups.Any(sg => sg.GroupId == request.GroupId && sg.IsActive && sg.LeftAt == null))
                .AsQueryable();

            // Search
            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x =>
                    x.FullName.Contains(search) ||
                    x.PhoneNumber.Contains(search));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var presentCount = await query
                .CountAsync(s => s.Attendances.Any(a =>
                    a.SessionId == request.SessionId &&
                    a.AttendanceDate == request.AttendanceDate &&
                    a.Status == AttendanceStatus.Present),
                    cancellationToken);

            var absentCount = await query
                .CountAsync(s => s.Attendances.Any(a =>
                    a.SessionId == request.SessionId &&
                    a.AttendanceDate == request.AttendanceDate &&
                    a.Status == AttendanceStatus.Absent),
                    cancellationToken);

            var students = await query
                .OrderBy(x => x.FullName)
                .Skip((request.PageIndex - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(x => new StudentAttendenceDTO
                {
                    Id = x.Id,
                    FullName = x.FullName,
                    Phone = x.PhoneNumber,
                    ParentPhoneNumber = x.ParentPhoneNumber,
                    GroupId = request.GroupId,
                    Status = x.Attendances
                        .Where(a =>
                            a.SessionId == request.SessionId &&
                            a.AttendanceDate == request.AttendanceDate)
                        .Select(a => (AttendanceStatus?)a.Status)
                        .FirstOrDefault()
                })
                .ToListAsync(cancellationToken);

            var result = new PagedResult<StudentAttendenceDTO>
            {
                Items = students,
                PageIndex = request.PageIndex,
                PageSize = request.PageSize,
                TotalCount = totalCount
            };

            var message = students.Any()
                ? "تم جلب طلاب المجموعة بنجاح."
                : "لا يوجد طلاب في هذه المجموعة.";

            return Success(result, message);
        }
        catch (Exception)
        {
            return BadRequest<PagedResult<StudentAttendenceDTO>>("حدث خطأ أثناء جلب طلاب المجموعة.");
        }
    }


}