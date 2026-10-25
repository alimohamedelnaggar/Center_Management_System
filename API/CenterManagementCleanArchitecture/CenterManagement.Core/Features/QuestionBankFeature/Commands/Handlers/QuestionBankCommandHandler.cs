using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Core.Features.QuestionBankFeature.Commands.Models;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.Extensions.Localization;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Core.Features.QuestionBankFeature.Commands.Handlers;

public class QuestionBankCommandHandler : ResponseHandler,
    IRequestHandler<AddQuestionBankCommand, Response<string>>,
    IRequestHandler<EditQuestionBankCommand, Response<string>>,
    IRequestHandler<DeleteQuestionBankCommand, Response<string>>
{
    #region Fields
    private readonly IRepositoryManager _repositoryManager;
    private readonly IMediator _mediator;
    #endregion

    #region Constructors
    public QuestionBankCommandHandler(
        IRepositoryManager repositoryService,
        IStringLocalizer<SharedResources> localizer,
        IMediator mediator)
        : base(localizer)
    {
        _repositoryManager = repositoryService;
        _mediator = mediator;
    }
    #endregion

    #region Handle Functions

    public async Task<Response<string>> Handle(
        AddQuestionBankCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentUser =
                (await _mediator.Send(new GetUserIdQuery())).Data;

            var academicYear = await _repositoryManager.AcademicYearRepository
                .GetByIdAsync(request.AcademicYearId);

            if (academicYear == null)
                return NotFound<string>("السنة الدراسية غير موجودة");

            var name = request.Name.Trim();

            var exists = await _repositoryManager.QuestionBankRepository
                .IsNameExistExceptSelf(x =>
                    x.AcademicYearId == request.AcademicYearId &&
                    x.Name == name);

            if (exists)
                return BadRequest<string>("يوجد بنك بهذا الاسم في هذه السنة الدراسية");

            var entity = new QuestionBank
            {
                Name = name,
                AcademicYearId = request.AcademicYearId,
                CreatedBy = currentUser
            };

            await _repositoryManager.QuestionBankRepository.AddAsync(entity);

            await _repositoryManager.SaveChangesAsync();

            return Success<string>(null, "تم إضافة بنك الأسئلة بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ أثناء حفظ بنك الأسئلة");
        }
    }

    public async Task<Response<string>> Handle(
        EditQuestionBankCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentUser =
                (await _mediator.Send(new GetUserIdQuery())).Data;

            var entity = await _repositoryManager.QuestionBankRepository
                .GetByIdAsync(request.Id);

            if (entity == null)
                return NotFound<string>("بنك الأسئلة غير موجود");

            var academicYear = await _repositoryManager.AcademicYearRepository
                .GetByIdAsync(request.AcademicYearId);

            if (academicYear == null)
                return NotFound<string>("السنة الدراسية غير موجودة");

            var name = request.Name.Trim();

            var exists = await _repositoryManager.QuestionBankRepository
                .IsNameExistExceptSelf(x =>
                    x.Id != request.Id &&
                    x.AcademicYearId == request.AcademicYearId &&
                    x.Name == name);

            if (exists)
                return BadRequest<string>("يوجد بنك بهذا الاسم في هذه السنة الدراسية");

            entity.Name = name;
            entity.AcademicYearId = request.AcademicYearId;
            entity.UpdatedBy = currentUser;
            entity.UpdatedAt = DateTime.UtcNow;

            await _repositoryManager.SaveChangesAsync();

            return Success<string>(null, "تم تحديث بنك الأسئلة بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("فشل في تحديث بنك الأسئلة");
        }
    }

    public async Task<Response<string>> Handle(
        DeleteQuestionBankCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentUser =
                (await _mediator.Send(new GetUserIdQuery())).Data;

            var entity = await _repositoryManager.QuestionBankRepository
                .GetByIdAsync(request.Id);

            if (entity == null)
                return NotFound<string>("بنك الأسئلة غير موجود");

            var questions = await _repositoryManager.QuestionRepository
                .GetTableTracking()
                .Include(x => x.Options)
                .Where(x => x.QuestionBankId == entity.Id)
                .ToListAsync(cancellationToken);

            foreach (var question in questions)
            {
                foreach (var option in question.Options)
                {
                    option.IsDeleted = true;
                    option.DeletedAt = DateTime.UtcNow;
                }

                question.IsDeleted = true;
                question.DeletedAt = DateTime.UtcNow;
            }

            entity.IsDeleted = true;
            entity.DeletedBy = currentUser;
            entity.DeletedAt = DateTime.UtcNow;

            await _repositoryManager.SaveChangesAsync();

            return Deleted<string>("تم حذف بنك الأسئلة بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ أثناء حذف بنك الأسئلة");
        }
    }

    #endregion
}