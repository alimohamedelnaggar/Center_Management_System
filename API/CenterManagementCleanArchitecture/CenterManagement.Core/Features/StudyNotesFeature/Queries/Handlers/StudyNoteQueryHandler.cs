using CenterManagement.Core.Features.StudyNotesFeature.Dtos;
using CenterManagement.Core.Features.StudyNotesFeature.Queries.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Core.Features.StudyNotesFeature.Queries.Handlers;

public class StudyNoteQueryHandler : ResponseHandler,
    IRequestHandler<GetStudyNotesPaginatedQuery, Response<PaginatedResult<StudyNoteDTO>>>
{
    #region Fields
    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;
    #endregion

    #region Constructors
    public StudyNoteQueryHandler(
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

    public async Task<Response<PaginatedResult<StudyNoteDTO>>> Handle(
        GetStudyNotesPaginatedQuery request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        if (request.GroupId.HasValue && !scope.Allows(request.GroupId.Value))
            return NotFound<PaginatedResult<StudyNoteDTO>>("المجموعة غير موجودة.");

        var query = _repositoryManager.StudyNoteRepository
            .GetTableNoTracking()
            .AsQueryable()
            .ScopeToUser(scope);

        if (request.GroupId.HasValue)
            query = query.Where(x => x.StudyNoteGroups.Any(g => g.GroupId == request.GroupId.Value));

        if (!string.IsNullOrWhiteSpace(request.Search))
            query = query.Where(x => x.Title.Contains(request.Search));

        var totalCount = await query.CountAsync(cancellationToken);

        var notes = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new StudyNoteDTO
            {
                Id = x.Id,
                Title = x.Title,
                Description = x.Description,
                FileName = x.FileName,
                OriginalFileName = x.OriginalFileName,
                FileSize = x.FileSize,
                CreatedAt = x.CreatedAt,
                GroupIds = x.StudyNoteGroups.Select(g => g.GroupId).ToList(),
                GroupNames = x.StudyNoteGroups.Select(g => g.Group.Name).ToList()
            })
            .ToListAsync(cancellationToken);

        var result = PaginatedResult<StudyNoteDTO>.Success(
            notes,
            totalCount,
            request.PageNumber,
            request.PageSize);

        return Success(result);
    }

    #endregion
}
