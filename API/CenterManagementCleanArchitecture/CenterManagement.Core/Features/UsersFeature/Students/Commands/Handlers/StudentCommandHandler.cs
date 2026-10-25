using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;
using CenterManagement.Core.Features.UsersFeature.Students.Queries.Results;
using CenterManagement.Core.Features.UsersFeature.Students.Services;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Handlers;

public class StudentCommandHandler : ResponseHandler,
    IRequestHandler<AddStudentCommand, Response<AddStudentResult>>,
    IRequestHandler<EditStudentCommand, Response<AddStudentResult>>,
    IRequestHandler<ChangeStatusStudentCommand, Response<string>>,
    IRequestHandler<ChangePaymentStatusStudentCommand, Response<string>>,
    IRequestHandler<DeleteStudentCommand, Response<string>>,
    IRequestHandler<GenerateStudentAccountsCommand, Response<GenerateStudentAccountsResult>>
{
    #region Fields

    private readonly IRepositoryManager _repositoryManager;
    private readonly IStringLocalizer<SharedResources> _localizer;
    private readonly IStudentNotificationService _notificationService;
    private readonly IMediator _mediator;
    private readonly UserManager<User> _userManager;
    private readonly IStudentCreationService _studentCreationService;
    private readonly IStudentAccountService _studentAccountService;

    #endregion

    #region Constructors

    public StudentCommandHandler(
        IRepositoryManager repositoryService,
        IStringLocalizer<SharedResources> localizer,
        IStudentNotificationService notificationService,
        IMediator mediator,
        UserManager<User> userManager,
        IStudentCreationService studentCreationService,
        IStudentAccountService studentAccountService)
        : base(localizer)
    {
        _repositoryManager = repositoryService;
        _localizer = localizer;
        _notificationService = notificationService;
        _mediator = mediator;
        _userManager = userManager;
        _studentCreationService = studentCreationService;
        _studentAccountService = studentAccountService;
    }

    #endregion

    #region Handle Functions

    // =========================================================
    // Add Student
    // =========================================================
    public async Task<Response<AddStudentResult>> Handle(
        AddStudentCommand request,
        CancellationToken cancellationToken)
    {
        var group = await _repositoryManager.GroupRepository
            .GetByIdAsync(request.GroupId);

        if (group is null)
            return NotFound<AddStudentResult>("الجروب غير موجود");

        var addition = await _studentCreationService.EnsureCanAddStudents(
            group.CenterId ?? Guid.Empty, 1, cancellationToken);

        if (!addition.Allowed)
            return BadRequest<AddStudentResult>(
                addition.Reason ?? "لا يمكن إضافة المزيد من الطلاب لهذا المركز");

        var fullName = request.FullName.Trim();

        await using var transaction =
            await _repositoryManager.BeginTransactionAsync();

        try
        {
            var student = await _studentCreationService.CreateStudentAsync(
                new CreateStudentInput
                {
                    FullName = fullName,
                    PhoneNumber = request.Phone,
                    ParentPhoneNumber = request.PhoneParent,
                    GroupId = request.GroupId,
                    SubscriptionType = request.SubscriptionType,
                    CustomMonthlyPrice = request.CustomMonthlyPrice,
                    CenterId = group.CenterId
                },
                cancellationToken);

            await transaction.CommitAsync();

            var (credential, _) = await _studentAccountService.CreateAccountAsync(student, cancellationToken);

            var dto = new StudentPagedDTO
            {
                Id = student.Id,
                FullName = student.FullName,
                Phone = student.PhoneNumber,
                PhoneParent = student.ParentPhoneNumber,
                GroupId = request.GroupId,
                GroupName = group.Name,
                SubscriptionType = student.SubscriptionType,
                CustomMonthlyPrice = student.CustomMonthlyPrice,
                IsActive = student.IsActive,
                QrCode = student.QrCode
            };

            await _notificationService
                .StudentAddedAsync(dto);

            return Success<AddStudentResult>(
                new AddStudentResult { Account = credential },
                "تم اضافة طالب بنجاح");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();

            return BadRequest<AddStudentResult>(
                ex.InnerException?.Message ?? ex.Message);
        }
    }

    // =========================================================
    // Edit Student / Transfer Group
    // =========================================================
    public async Task<Response<AddStudentResult>> Handle(
        EditStudentCommand request,
        CancellationToken cancellationToken)
    {
        // ---------------------------------------------------------
        // Validate Name
        // ---------------------------------------------------------
        var fullName = request.FullName.Trim();

        // ---------------------------------------------------------
        // Check Student
        // ---------------------------------------------------------
        var student =
            await _repositoryManager.StudentRepository
                .GetDetailsAsync(request.Id);

        if (student is null)
            return NotFound<AddStudentResult>("الطالب غير موجود");

        // ---------------------------------------------------------
        // Check Group
        // ---------------------------------------------------------
        var group =
            await _repositoryManager.GroupRepository
                .GetByIdAsync(request.GroupId);

        if (group is null)
            return NotFound<AddStudentResult>("الجروب غير موجود");

        await using var transaction =
            await _repositoryManager.BeginTransactionAsync();

        try
        {
            // =====================================================
            // Update Student Information
            // =====================================================

            student.FullName = fullName;
            student.PhoneNumber = request.Phone;
            student.ParentPhoneNumber = request.PhoneParent;
            student.SubscriptionType = request.SubscriptionType;
            student.CustomMonthlyPrice = request.CustomMonthlyPrice;

            // =====================================================
            // Handle Student Groups
            // =====================================================

            // كل الجروبات النشطة حاليًا للطالب
            var activeGroups = student.StudentGroups
                .Where(sg =>
                    sg.IsActive &&
                    sg.LeftAt == null)
                .ToList();

            // -----------------------------------------------------
            // Close every active group except requested group
            // -----------------------------------------------------
            foreach (var oldGroup in activeGroups)
            {
                if (oldGroup.GroupId != request.GroupId)
                {
                    oldGroup.IsActive = false;
                    oldGroup.LeftAt = DateTime.UtcNow;
                }
            }

            // -----------------------------------------------------
            // IMPORTANT:
            // Search for ANY existing StudentGroup for this group.
            //
            // We don't search only for IsActive == true because
            // there may be an old inactive StudentGroup with the
            // same StudentId + GroupId.
            //
            // Creating another StudentGroup in that case causes:
            //
            // "another instance with the same key value is already
            // being tracked"
            // -----------------------------------------------------
            var existingGroup = student.StudentGroups
                .FirstOrDefault(sg =>
                    sg.GroupId == request.GroupId);

            // -----------------------------------------------------
            // StudentGroup already exists
            // -----------------------------------------------------
            if (existingGroup != null)
            {
                // Use the SAME tracked entity.
                existingGroup.IsActive = true;
                existingGroup.LeftAt = null;

                // Don't change JoinDate when the student is simply
                // editing his information or staying in the same group.
            }
            else
            {
                // -------------------------------------------------
                // StudentGroup doesn't exist at all
                // -------------------------------------------------
                student.StudentGroups.Add(new StudentGroup
                {
                    GroupId = request.GroupId,
                    JoinDate = DateTime.UtcNow,
                    IsActive = true,
                    LeftAt = null
                });
            }

            // =====================================================
            // Save Changes
            // =====================================================

            await _repositoryManager.SaveChangesAsync();

            await transaction.CommitAsync();

            StudentAccountCredential? credential = null;

            if (student.UserId == null)
                (credential, _) = await _studentAccountService.CreateAccountAsync(
                    student, cancellationToken);

            // =====================================================
            // Notification
            // =====================================================

            var dto = new StudentPagedDTO
            {
                Id = student.Id,
                FullName = student.FullName,
                Phone = student.PhoneNumber,
                PhoneParent = student.ParentPhoneNumber,
                GroupId = group.Id,
                GroupName = group.Name,
                SubscriptionType = student.SubscriptionType,
                CustomMonthlyPrice = student.CustomMonthlyPrice,
                IsActive = student.IsActive
            };

            await _notificationService
                .StudentUpdatedAsync(dto);

            return Success<AddStudentResult>(
                new AddStudentResult { Account = credential },
                "تم تحديث بيانات الطالب بنجاح");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();

            return BadRequest<AddStudentResult>(
                ex.InnerException?.Message ?? ex.Message);
        }
    }

    // =========================================================
    // Change Payment Status
    // =========================================================
    public async Task<Response<string>> Handle(
        ChangePaymentStatusStudentCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var student =
                await _repositoryManager.StudentRepository
                    .GetByIdAsync(request.Id);

            if (student == null)
                return NotFound<string>("الطالب غير موجود");

            student.IsPaid = !student.IsPaid;

            await _repositoryManager.SaveChangesAsync();

            await _notificationService
                .StudentChangePaymentStatusAsync(request.Id);

            return Success(
                "تم تغيير حالة الدفع الخاصة ب الطالب بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>(
                "حدث خطأ اثناء تغيير حالة الدفع الخاصة ب الطالب , حاول مرة اخري");
        }
    }

    // =========================================================
    // Delete Student
    // =========================================================
    public async Task<Response<string>> Handle(
        DeleteStudentCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var student =
                await _repositoryManager.StudentRepository
                    .GetByIdAsync(request.Id);

            if (student == null)
                return NotFound<string>("الطالب غير موجود");

            // Soft Delete
            student.IsDeleted = true;
            student.DeletedAt = DateTime.UtcNow;

            await _repositoryManager.StudentRepository
                .DeleteAsync(student);

            await _repositoryManager.SaveChangesAsync();

            await _notificationService
                .StudentDeletedAsync(request.Id);

            return Deleted<string>(
                "تم حذف الطالب بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>(
                "حدث خطأ اثناء حذف الطالب , حاول مرة اخري");
        }
    }

    // =========================================================
    // Change Student Status
    // =========================================================
    public async Task<Response<string>> Handle(
        ChangeStatusStudentCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var student =
                await _repositoryManager.StudentRepository
                    .GetByIdAsync(request.Id);

            if (student == null)
                return NotFound<string>("الطالب غير موجود");

            student.IsActive = !student.IsActive;

            await _repositoryManager.SaveChangesAsync();

            await _notificationService
                .StudentChangeStatusAsync(request.Id);

            return Success<string>(
                "تم تغيير حالة الطالب بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>(
                "حدث خطأ اثناء تغيير حالة الطالب , حاول مرة اخري");
        }
    }

    #endregion

    #region Helpers

    // ---------------------------------------------------------
    // Student login accounts (Identity user + "Student" role)
    // ---------------------------------------------------------
    public async Task<Response<GenerateStudentAccountsResult>> Handle(
        GenerateStudentAccountsCommand request,
        CancellationToken cancellationToken)
    {
        var students = await _repositoryManager.StudentRepository
            .GetTableTracking()
            .Where(x => !x.IsDeleted)
            .Select(x => new
            {
                Student = x,
                GroupName = x.StudentGroups
                    .Where(sg => sg.IsActive && sg.LeftAt == null)
                    .OrderByDescending(sg => sg.JoinDate)
                    .Select(sg => sg.Group.Name)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        var result = new GenerateStudentAccountsResult();

        foreach (var item in students)
        {
            var student = item.Student;
            var alreadyHasAccount = student.UserId != null;

            // The credentials rule for this center: username = password = phone.
            // A student who already chose a permanent password is never reset;
            // the sheet then only says that the password was changed.
            if (alreadyHasAccount)
            {
                var user = await _userManager.FindByIdAsync(student.UserId!.Value.ToString());
                var (password, passwordChanged) = user is null
                    ? (null, false)
                    : await _studentAccountService.ResolveCredentialsAsync(
                        user, student.PhoneNumber, cancellationToken);

                result.All.Add(new StudentCredentialRow
                {
                    StudentId = student.Id,
                    StudentName = student.FullName,
                    GroupName = item.GroupName,
                    Phone = student.PhoneNumber,
                    Username = student.PhoneNumber,
                    HasAccount = user is not null,
                    TemporaryPassword = password,
                    PasswordChanged = passwordChanged
                });

                continue;
            }

            var (credential, reason) = await _studentAccountService.CreateAccountAsync(
                student, cancellationToken);

            result.All.Add(new StudentCredentialRow
            {
                StudentId = student.Id,
                StudentName = student.FullName,
                GroupName = item.GroupName,
                Phone = student.PhoneNumber,
                Username = student.PhoneNumber,
                HasAccount = credential is not null,
                TemporaryPassword = credential?.TemporaryPassword,
                PasswordChanged = false
            });

            if (credential is not null)
                result.Created.Add(credential);
            else
                result.Skipped.Add(new SkippedStudentAccount
                {
                    StudentId = student.Id,
                    StudentName = student.FullName,
                    Reason = reason ?? "سبب غير معروف"
                });
        }

        var message =
            $"تم إنشاء {result.Created.Count} حساب، وتم تخطي {result.Skipped.Count} طالب";

        return Success(result, message);
    }

    #endregion
}