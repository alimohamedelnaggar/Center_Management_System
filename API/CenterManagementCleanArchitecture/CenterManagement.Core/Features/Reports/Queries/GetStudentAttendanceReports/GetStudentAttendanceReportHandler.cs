using CenterManagement.Core.Features.Reports.Queries.GetStudentAttendanceReports;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

public class GetStudentAttendanceReportHandler
    : ResponseHandler,
      IRequestHandler<GetStudentAttendanceReportQuery, Response<StudentAttendanceReportDto>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;

    public GetStudentAttendanceReportHandler(
        IRepositoryManager repositoryManager,
        IUserScopeService scopeService,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
    }

    public async Task<Response<StudentAttendanceReportDto>> Handle(
        GetStudentAttendanceReportQuery request,
        CancellationToken cancellationToken)
    {
        var student = await _repositoryManager
            .StudentRepository
            .GetDetailsAsync(request.StudentId);

        if (student is null)
            return NotFound<StudentAttendanceReportDto>();

        if (!await _scopeService.AllowsStudentAsync(request.StudentId, cancellationToken))
            return Forbidden<StudentAttendanceReportDto>();

        var activeGroup = student.StudentGroups
            .FirstOrDefault(sg => sg.IsActive && sg.LeftAt == null)?.Group;

        var attendances = await _repositoryManager
            .AttendanceRepository
            .GetStudentAttendanceAsync(request.StudentId, cancellationToken);

        if (request.GroupId.HasValue)
        {
            attendances = attendances
                .Where(x => x.Session.GroupId == request.GroupId.Value)
                .ToList();
        }

        var totalSessions = attendances.Count;

        var presentCount = attendances.Count(x => x.Status == AttendanceStatus.Present);

        var absentCount = attendances.Count(x => x.Status == AttendanceStatus.Absent);

        var attendancePercentage = totalSessions == 0
            ? 0
            : Math.Round((decimal)presentCount / totalSessions * 100, 2);

        var result = new StudentAttendanceReportDto
        {
            StudentId = student.Id,
            StudentName = student.FullName,
            GroupName = activeGroup?.Name ?? string.Empty,

            TotalSessions = totalSessions,
            PresentCount = presentCount,
            AbsentCount = absentCount,
            AttendancePercentage = attendancePercentage,

            Records = attendances
                .OrderByDescending(x => x.AttendanceDate)
                .Select(x => new AttendanceRecordDto
                {
                    AttendanceDate = x.AttendanceDate,
                    Status = x.Status,
                    DayOfWeek = x.Session.DayOfWeek,
                    StartTime = x.Session.StartTime,
                    EndTime = x.Session.EndTime,
                    Notes = x.Notes
                })
                .ToList()
        };

        return Success(result);
    }
}