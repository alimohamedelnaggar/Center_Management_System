using CenterManagement.Core.Features.ParentPortalFeature.Commands.Models;
using CenterManagement.Core.Features.ParentPortalFeature.Dtos;
using CenterManagement.Core.Features.ParentPortalFeature.Services;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.ParentPortalFeature.Commands.Handlers;

/// <summary>
/// Creates (or reuses) the parent login account of every student matching the
/// filter in one request. A student that cannot be processed never aborts the
/// run: it is reported in the "skipped" bucket with a reason.
/// </summary>
public class BulkCreateParentAccountsCommandHandler : ResponseHandler,
    IRequestHandler<BulkCreateParentAccountsCommand, Response<BulkCreateParentAccountsResult>>
{
    private readonly AppDbContext _context;
    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;
    private readonly IParentAccountService _parentAccountService;

    public BulkCreateParentAccountsCommandHandler(
        AppDbContext context,
        IRepositoryManager repositoryManager,
        IUserScopeService scopeService,
        IParentAccountService parentAccountService,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _context = context;
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
        _parentAccountService = parentAccountService;
    }

    public async Task<Response<BulkCreateParentAccountsResult>> Handle(
        BulkCreateParentAccountsCommand request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        var query = _repositoryManager
            .StudentRepository
            .GetTableNoTracking()
            .ScopeToUser(scope);

        // Search on the student name or one of the phone numbers.
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            query = query.Where(x =>
                x.FullName.Contains(search) ||
                x.PhoneNumber.Contains(search) ||
                x.ParentPhoneNumber.Contains(search));
        }

        // Filter by group.
        if (request.GroupId.HasValue)
        {
            query = query.Where(s => s.StudentGroups.Any(sg =>
                sg.GroupId == request.GroupId.Value && sg.IsActive && sg.LeftAt == null));
        }

        // Filter by status.
        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == request.IsActive);
        }

        // Leave the students that already have a parent account in this center alone.
        if (request.SkipAlreadyLinked)
        {
            query = query.Where(s => !_context.ParentStudentLinks.Any(l => l.StudentId == s.Id));
        }

        var orderedQuery = query.OrderBy(x => x.FullName);

        var limitedQuery = request.MaxStudents > 0
            ? orderedQuery.Take(Math.Clamp(request.MaxStudents, 1, 20000))
            : orderedQuery;

        var candidates = await limitedQuery
            .Select(x => new
            {
                Student = x,
                GroupName = x.StudentGroups
                    .Where(sg => sg.IsActive && sg.LeftAt == null)
                    .OrderByDescending(sg => sg.JoinDate)
                    .Select(sg => sg.Group.Name)
                    .FirstOrDefault() ?? string.Empty
            })
            .ToListAsync(cancellationToken);

        var result = new BulkCreateParentAccountsResult();

        foreach (var candidate in candidates)
        {
            var outcome = await _parentAccountService.EnsureAccountAsync(candidate.Student, cancellationToken);

            var created = outcome.Status == ParentAccountOutcomeStatus.Created;

            result.All.Add(new ParentAccountPrintRow
            {
                StudentId = outcome.StudentId,
                StudentName = outcome.StudentName,
                GroupName = candidate.GroupName,
                ParentPhone = outcome.ParentPhone,
                Username = outcome.ParentPhone,
                HasAccount = created || outcome.Status == ParentAccountOutcomeStatus.Linked,
                TemporaryPassword = outcome.Status == ParentAccountOutcomeStatus.Skipped ||
                                    outcome.PasswordChanged
                    ? null
                    : outcome.TemporaryPassword ?? outcome.ParentPhone,
                PasswordChanged = outcome.PasswordChanged
            });

            switch (outcome.Status)
            {
                case ParentAccountOutcomeStatus.Created:
                    result.Created.Add(new ParentAccountCredential
                    {
                        StudentId = outcome.StudentId,
                        StudentName = outcome.StudentName,
                        GroupName = candidate.GroupName,
                        ParentPhone = outcome.ParentPhone,
                        Username = outcome.ParentPhone,
                        TemporaryPassword = outcome.TemporaryPassword,
                        LinkedExistingAccount = false,
                        PasswordChanged = false
                    });
                    break;

                case ParentAccountOutcomeStatus.Linked:
                    result.Linked.Add(new ParentAccountCredential
                    {
                        StudentId = outcome.StudentId,
                        StudentName = outcome.StudentName,
                        GroupName = candidate.GroupName,
                        ParentPhone = outcome.ParentPhone,
                        Username = outcome.ParentPhone,
                        TemporaryPassword = null,
                        LinkedExistingAccount = true,
                        PasswordChanged = outcome.PasswordChanged
                    });
                    break;

                default:
                    result.Skipped.Add(new SkippedParentAccount
                    {
                        StudentId = outcome.StudentId,
                        StudentName = outcome.StudentName,
                        GroupName = candidate.GroupName,
                        ParentPhone = outcome.ParentPhone,
                        Reason = outcome.Reason ?? "سبب غير معروف"
                    });
                    break;
            }
        }

        var message =
            $"تمت مراجعة {candidates.Count} طالب: إنشاء {result.Created.Count} حساب، " +
            $"ربط {result.Linked.Count} طالب بحسابات موجودة، وتخطي {result.Skipped.Count} طالب";

        return Success(result, message);
    }
}
