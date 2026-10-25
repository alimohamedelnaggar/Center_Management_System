using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Core.Features.NotificationFeature.Dtos;
using CenterManagement.Core.Features.StudyNotesFeature.Commands.Models;
using CenterManagement.Data.Entities.Notifications;
using CenterManagement.Data.Entities.Notes;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Core.Features.StudyNotesFeature.Commands.Handlers;

public class StudyNoteCommandHandler : ResponseHandler,
    IRequestHandler<CreateStudyNoteCommand, Response<Guid>>,
    IRequestHandler<DeleteStudyNoteCommand, Response<string>>
{
    #region Fields
    private static readonly string[] AllowedExtensions = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];
    private const long MaxFileSize = 20 * 1024 * 1024;

    private readonly IRepositoryManager _repositoryManager;
    private readonly IMediator _mediator;
    private readonly INotificationPusher _notificationPusher;
    #endregion

    #region Constructors
    public StudyNoteCommandHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> localizer,
        IMediator mediator,
        INotificationPusher notificationPusher)
        : base(localizer)
    {
        _repositoryManager = repositoryManager;
        _mediator = mediator;
        _notificationPusher = notificationPusher;
    }
    #endregion

    #region Handle Functions

    public async Task<Response<Guid>> Handle(
        CreateStudyNoteCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest<Guid>("اكتب عنوان المذكرة");

            if (request.File == null || request.File.Length == 0)
                return BadRequest<Guid>("اختر ملف المذكرة");

            if (request.GroupIds == null || request.GroupIds.Count == 0)
                return BadRequest<Guid>("اختر مجموعة واحدة على الأقل");

            var extension = Path.GetExtension(request.File.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
                return BadRequest<Guid>("صيغة الملف غير مدعومة، المسموح PDF أو Word أو PowerPoint");

            if (request.File.Length > MaxFileSize)
                return BadRequest<Guid>("حجم الملف كبير، الحد الأقصى 20 ميجابايت");

            var groupIds = request.GroupIds.Distinct().ToList();

            var validGroupIds = await _repositoryManager.GroupRepository
                .GetTableNoTracking()
                .Where(g => groupIds.Contains(g.Id))
                .Select(g => g.Id)
                .ToListAsync(cancellationToken);

            if (validGroupIds.Count == 0)
                return BadRequest<Guid>("المجموعات المختارة غير موجودة");

            var currentUser = (await _mediator.Send(new GetUserIdQuery(), cancellationToken)).Data;

            var storedFileName = await SaveFileAsync(request.File, cancellationToken);

            var note = new StudyNote
            {
                Title = request.Title.Trim(),
                Description = string.IsNullOrWhiteSpace(request.Description)
                    ? null
                    : request.Description.Trim(),
                FileName = storedFileName,
                OriginalFileName = request.File.FileName,
                FileSize = request.File.Length,
                UploadedBy = currentUser,
                CreatedBy = currentUser
            };

            foreach (var groupId in validGroupIds)
            {
                note.StudyNoteGroups.Add(new StudyNoteGroup
                {
                    StudyNoteId = note.Id,
                    GroupId = groupId
                });
            }

            await _repositoryManager.StudyNoteRepository.AddAsync(note);
            await _repositoryManager.SaveChangesAsync();

            await NotifyStudentsAsync(note, validGroupIds);

            return Success(note.Id, "تم إضافة المذكرة بنجاح");
        }
        catch
        {
            return BadRequest<Guid>("حدث خطأ أثناء إضافة المذكرة");
        }
    }

    public async Task<Response<string>> Handle(
        DeleteStudyNoteCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var note = await _repositoryManager.StudyNoteRepository
                .GetTableTracking()
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

            if (note == null)
                return NotFound<string>("المذكرة غير موجودة");

            var currentUser = (await _mediator.Send(new GetUserIdQuery(), cancellationToken)).Data;

            DeleteFile(note.FileName);

            note.IsDeleted = true;
            note.DeletedBy = currentUser;
            note.DeletedAt = DateTime.UtcNow;

            await _repositoryManager.SaveChangesAsync();

            return Deleted<string>("تم حذف المذكرة بنجاح");
        }
        catch
        {
            return BadRequest<string>("حدث خطأ أثناء حذف المذكرة");
        }
    }

    #endregion

    #region Helpers

    private async Task NotifyStudentsAsync(StudyNote note, List<Guid> groupIds)
    {
        try
        {
            var userIds = await _repositoryManager.StudentGroupRepository
                .GetTableNoTracking()
                .Where(sg => groupIds.Contains(sg.GroupId) && sg.IsActive && sg.LeftAt == null)
                .Select(sg => sg.Student.UserId)
                .Where(id => id != null)
                .Select(id => id!.Value)
                .Distinct()
                .ToListAsync();

            if (userIds.Count == 0)
                return;

            const string title = "مذكرة جديدة";
            var body = $"المدرس نزّل مذكرة جديدة: {note.Title}";

            var notifications = userIds.Select(uid => new Notification
            {
                UserId = uid,
                Title = title,
                Body = body,
                Type = "StudyNoteCreated",
                ReferenceId = note.Id,
                ReferenceType = nameof(StudyNote)
            }).ToList();

            await _repositoryManager.NotificationRepository.AddRangeAsync(notifications);
            await _repositoryManager.SaveChangesAsync();

            await _notificationPusher.PushAsync(userIds, new NotificationDTO
            {
                Title = title,
                Body = body,
                Type = "StudyNoteCreated",
                ReferenceId = note.Id,
                ReferenceType = nameof(StudyNote),
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }
        catch
        {
            // Notification failure must never break note creation.
        }
    }

    private static async Task<string> SaveFileAsync(IFormFile file, CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName = $"{Guid.NewGuid():N}{extension}";

        var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "notes");
        Directory.CreateDirectory(folder);

        var path = Path.Combine(folder, fileName);

        await using var stream = new FileStream(path, FileMode.Create);
        await file.CopyToAsync(stream, cancellationToken);

        return fileName;
    }

    private static void DeleteFile(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            return;

        try
        {
            var path = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "notes", fileName);
            if (File.Exists(path))
                File.Delete(path);
        }
        catch
        {
            // Ignore file deletion failures.
        }
    }

    #endregion
}
