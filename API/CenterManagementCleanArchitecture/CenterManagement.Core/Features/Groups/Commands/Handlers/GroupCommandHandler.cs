using CenterManagement.Core.Hubs.Abstractions;
using CenterManagement.Data.Entities.Groups;
using Microsoft.EntityFrameworkCore.Storage;
using System.Globalization;

namespace CenterManagement.Core.Features.Groups.Commands.Handlers;

public class GroupCommandHandler : ResponseHandler,
    IRequestHandler<CreateGroupCommand, Response<string>>,
    IRequestHandler<UpdateGroupCommand, Response<string>>,
    IRequestHandler<DeleteGroupCommand, Response<string>>
{
    #region Fields
    private readonly AppDbContext _context;
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly IGroupNotificationService _notificationService;
    private readonly IUserScopeService _scopeService;
    private readonly ITenantContext _tenantContext;
    #endregion

    #region Constructors
    public GroupCommandHandler(IStringLocalizer<SharedResources> stringLocalizer,
        AppDbContext context,
        IGroupNotificationService notificationService,
        IUserScopeService scopeService,
        ITenantContext tenantContext) : base(stringLocalizer)
    {
        _context = context;
        _stringLocalizer = stringLocalizer;
        _notificationService = notificationService;
        _scopeService = scopeService;
        _tenantContext = tenantContext;
    }
    #endregion

    #region Constants
    /// <summary>
    /// Rejection message used when a client sends a teacherId that is not the
    /// center's single (solo) teacher.
    /// </summary>
    private const string SoloTeacherLinkMessage =
        "هذا السنتر من نوع مدرس واحد؛ تُربط المجموعة بمدرس السنتر تلقائيًا.";
    #endregion

    #region Handle Functions

    #region Helpers
    /// <summary>
    /// The center type that governs the group being written. Privileged
    /// (unrestricted) callers have no target center, so multi-teacher
    /// semantics apply.
    /// </summary>
    private async Task<Data.Enums.CenterType> ResolveGroupCenterTypeAsync()
    {
        if (!_tenantContext.CenterId.HasValue)
            return Data.Enums.CenterType.MultiTeacher;

        var type = await _context.Centers
            .Where(c => c.Id == _tenantContext.CenterId.Value)
            .Select(c => (Data.Enums.CenterType?)c.Type)
            .FirstOrDefaultAsync();

        return type ?? Data.Enums.CenterType.MultiTeacher;
    }

    /// <summary>
    /// The id of the single teacher of the current center: the Teacher user
    /// flagged as center admin.
    /// </summary>
    private async Task<Guid> GetSoloTeacherIdAsync(CancellationToken cancellationToken)
    {
        if (!_tenantContext.CenterId.HasValue)
            return Guid.Empty;

        var centerId = _tenantContext.CenterId.Value;

        var soloTeacherId = await _context.Users
            .Where(u => u.CenterId == centerId && u.IsCenterAdmin)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return soloTeacherId ?? Guid.Empty;
    }
    #endregion

    #region Create Group
    public async Task<Response<string>> Handle(CreateGroupCommand request, CancellationToken cancellationToken)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var group = new Group
                {
                    Name = request.Name,
                    MonthlyPrice = request.MonthlyPrice,
                    SessionsPerMonth = request.SessionsPerMonth,
                };

                // The center type decides how the teacher link is resolved.
                // Solo centers always link the single teacher; multi centers
                // require an explicit, in-center teacher.
                var centerType = await ResolveGroupCenterTypeAsync();

                if (centerType == Data.Enums.CenterType.SoloTeacher)
                {
                    var soloTeacherId = await GetSoloTeacherIdAsync(cancellationToken);

                    // A client-sent id that is not the solo teacher is a hard error;
                    // omitting the id is fine because there is exactly one teacher.
                    if (request.TeacherId.HasValue && request.TeacherId.Value != soloTeacherId)
                        return BadRequest<string>(SoloTeacherLinkMessage);

                    if (soloTeacherId == Guid.Empty)
                        return BadRequest<string>("لا يوجد مدرس مرتبط بهذا السنتر");

                    group.TeacherGroups = new List<TeacherGroup>
                    {
                        new TeacherGroup
                        {
                            TeacherId = soloTeacherId,
                            GroupId = group.Id,
                            CenterId = group.CenterId
                        }
                    };
                }
                else if (request.TeacherId.HasValue)
                {
                    var teacherBelongs = !_tenantContext.CenterId.HasValue
                        || await _context.Users.AnyAsync(u =>
                            u.Id == request.TeacherId.Value &&
                            u.CenterId == _tenantContext.CenterId.Value,
                            cancellationToken);

                    if (!teacherBelongs)
                        return BadRequest<string>("المعلم المحدد لا ينتمي لنفس المركز");

                    group.TeacherGroups = new List<TeacherGroup>
                    {
                        new TeacherGroup
                        {
                            TeacherId = request.TeacherId.Value,
                            GroupId = group.Id,
                            CenterId = group.CenterId
                        }
                    };
                }
                else
                {
                    return BadRequest<string>("يجب اختيار المعلم المسؤول عن المجموعة");
                }

                // Create real Session rows from the Schedule array
                if (request.Schedule != null && request.Schedule.Any())
                {
                    var sessions = new List<Session>();
                    foreach (var slot in request.Schedule)
                    {
                        TimeOnly startTime, endTime;
                        try
                        {
                            startTime = TimeOnly.Parse(slot.StartTime, CultureInfo.InvariantCulture);
                            endTime = TimeOnly.Parse(slot.EndTime, CultureInfo.InvariantCulture);
                        }
                        catch
                        {
                            return BadRequest<string>("تنسيق الوقت غير صحيح");
                        }

                        // Convert dayIndex (0=Saturday..6=Friday) to .NET DayOfWeek
                        var dayOfWeekEnum = (DayOfWeek)((slot.DayIndex + 6) % 7);

                        var session = new Session
                        {
                            StartTime = startTime,
                            EndTime = endTime,
                            DayOfWeek = dayOfWeekEnum,
                            GroupId = group.Id,
                            SessionPrice = request.PerSessionPrice,
                            CenterId = group.CenterId,
                            CreatedAt = DateTime.UtcNow
                        };
                        sessions.Add(session);
                    }
                    await _context.Sessions.AddRangeAsync(sessions, cancellationToken);
                }

                await _context.Groups.AddAsync(group, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                var groupDto = new GetGroupsPaginationResponse
                {
                    Id = group.Id,
                    Name = group.Name,
                    MonthlyPrice = group.MonthlyPrice
                };
                await _notificationService.GroupAddedAsync(groupDto);
                return Success<string>(_stringLocalizer[SharedResourcesKeys.Created]);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                var errorMessage = ex.InnerException?.Message ?? ex.Message;
                return BadRequest<string>(errorMessage);
            }
        });
    }
    #endregion

    #region Update Group
    public async Task<Response<string>> Handle(UpdateGroupCommand request, CancellationToken cancellationToken)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var group = await _context.Groups
                    .Include(g => g.TeacherGroups)
                    .Include(g => g.Sessions)
                    .FirstOrDefaultAsync(g => g.Id == request.Id, cancellationToken);

                if (group == null)
                    return NotFound<string>(_stringLocalizer[SharedResourcesKeys.NotFound]);

                var scope = await _scopeService.ResolveAsync(cancellationToken);
                if (!scope.Allows(group.Id))
                    return NotFound<string>(_stringLocalizer[SharedResourcesKeys.NotFound]);

                group.Name = request.Name;
                group.MonthlyPrice = request.MonthlyPrice;
                group.SessionsPerMonth = request.SessionsPerMonth;
                group.UpdatedAt = DateTime.UtcNow;

                // Update TeacherGroup link. An omitted/null TeacherId means
                // "keep the current link" (never delete links implicitly);
                // reassigning is an explicit change.
                var centerType = await ResolveGroupCenterTypeAsync();

                if (centerType == Data.Enums.CenterType.SoloTeacher)
                {
                    var soloTeacherId = await GetSoloTeacherIdAsync(cancellationToken);

                    if (request.TeacherId.HasValue && request.TeacherId.Value != soloTeacherId)
                        return BadRequest<string>(SoloTeacherLinkMessage);

                    if (soloTeacherId == Guid.Empty)
                        return BadRequest<string>("لا يوجد مدرس مرتبط بهذا السنتر");

                    var existingSoloLink = group.TeacherGroups.FirstOrDefault(l => l.TeacherId == soloTeacherId);
                    if (existingSoloLink == null)
                    {
                        group.TeacherGroups.Add(new TeacherGroup
                        {
                            TeacherId = soloTeacherId,
                            GroupId = group.Id,
                            CenterId = group.CenterId
                        });
                    }
                }
                else if (request.TeacherId.HasValue)
                {
                    var teacherBelongs = !_tenantContext.CenterId.HasValue
                        || await _context.Users.AnyAsync(u =>
                            u.Id == request.TeacherId.Value &&
                            u.CenterId == _tenantContext.CenterId.Value,
                            cancellationToken);

                    if (!teacherBelongs)
                        return BadRequest<string>("المعلم المحدد لا ينتمي لنفس المركز");

                    var existingLink = group.TeacherGroups.FirstOrDefault();
                    if (existingLink != null)
                    {
                        existingLink.TeacherId = request.TeacherId.Value;
                        _context.TeacherGroups.Update(existingLink);
                    }
                    else
                    {
                        group.TeacherGroups.Add(new TeacherGroup
                        {
                            TeacherId = request.TeacherId.Value,
                            GroupId = group.Id,
                            CenterId = group.CenterId
                        });
                    }
                }

                // Update schedule: only future sessions (no past sessions/attendance deleted)
                if (request.Schedule != null && request.Schedule.Any())
                {
                    var now = DateTime.UtcNow;
                    var pastSessions = group.Sessions
                        .Where(s => !s.IsDeleted && s.CreatedAt < now)
                        .ToList();

                    // Keep past sessions, only modify future ones
                    var futureSessions = group.Sessions
                        .Where(s => !s.IsDeleted && s.CreatedAt >= now)
                        .ToList();

                    _context.Sessions.RemoveRange(futureSessions);

                    var newSessions = new List<Session>();
                    foreach (var slot in request.Schedule)
                    {
                        TimeOnly startTime, endTime;
                        try
                        {
                            startTime = TimeOnly.Parse(slot.StartTime, CultureInfo.InvariantCulture);
                            endTime = TimeOnly.Parse(slot.EndTime, CultureInfo.InvariantCulture);
                        }
                        catch
                        {
                            return BadRequest<string>("تنسيق الوقت غير صحيح");
                        }

                        var dayOfWeekEnum = (DayOfWeek)((slot.DayIndex + 6) % 7);

                        var session = new Session
                        {
                            StartTime = startTime,
                            EndTime = endTime,
                            DayOfWeek = dayOfWeekEnum,
                            GroupId = group.Id,
                            SessionPrice = request.PerSessionPrice,
                            CenterId = group.CenterId,
                            CreatedAt = DateTime.UtcNow
                        };
                        newSessions.Add(session);
                    }
                    await _context.Sessions.AddRangeAsync(newSessions, cancellationToken);
                }

                _context.Groups.Update(group);
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                var groupDto = new GetGroupsPaginationResponse
                {
                    Id = group.Id,
                    Name = group.Name,
                    MonthlyPrice = group.MonthlyPrice
                };
                await _notificationService.GroupUpdatedAsync(groupDto);
                return Success<string>(_stringLocalizer[SharedResourcesKeys.Updated]);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                var errorMessage = ex.InnerException?.Message ?? ex.Message;
                return BadRequest<string>(errorMessage);
            }
        });
    }
    #endregion

    #region Delete Group
    public async Task<Response<string>> Handle(DeleteGroupCommand request, CancellationToken cancellationToken)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var group = await _context.Groups.FindAsync(new object[] { request.Id }, cancellationToken);

                if (group == null || group.IsDeleted)
                    return NotFound<string>(_stringLocalizer[SharedResourcesKeys.NotFound]);

                var scope = await _scopeService.ResolveAsync(cancellationToken);
                if (!scope.Allows(group.Id))
                    return NotFound<string>(_stringLocalizer[SharedResourcesKeys.NotFound]);

                group.IsDeleted = true;
                group.DeletedAt = DateTime.UtcNow;
                _context.Groups.Update(group);
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                await _notificationService.GroupDeletedAsync(group.Id);
                return Success<string>(_stringLocalizer[SharedResourcesKeys.Deleted]);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                var errorMessage = ex.InnerException?.Message ?? ex.Message;
                return BadRequest<string>(errorMessage);
            }
        });
    }
    #endregion

    #endregion
}