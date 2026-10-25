using CenterManagement.Core.Features.AcademicYearFeature.Commands.Models;
using CenterManagement.Core.Features.AcademicYearFeature.Dtos;
using CenterManagement.Core.Features.AcademicYearFeature.Queries.Models;
using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.AcademicYearFeature.Commands.Handlers;

public class AcademicYearCommandHandler : ResponseHandler,
    IRequestHandler<AddAcademicYearCommand, Response<string>>,
    IRequestHandler<EditAcademicYearCommand, Response<string>>,
    IRequestHandler<DeleteAcademicYearCommand, Response<string>>
{
    #region Fields
    private readonly IRepositoryManager _repositoryManager;
    private readonly IMediator _mediator;
    #endregion

    #region Constructors
    public AcademicYearCommandHandler(
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
        AddAcademicYearCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentUser =
                (await _mediator.Send(new GetUserIdQuery())).Data;

            var name = request.Name.Trim();

            var exists = await _repositoryManager.AcademicYearRepository
                .IsNameExistExceptSelf(x => x.Name == name);

            if (exists)
                return BadRequest<string>("هذه السنة الدراسية موجودة بالفعل");

            var entity = new AcademicYear
            {
                Name = name,
                Order = request.Order,
                CreatedBy = currentUser
            };

            await _repositoryManager.AcademicYearRepository.AddAsync(entity);

            await _repositoryManager.SaveChangesAsync();

            return Success<string>(null, "تم إضافة السنة الدراسية بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ أثناء حفظ السنة الدراسية");
        }
    }

    public async Task<Response<string>> Handle(
        EditAcademicYearCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentUser =
                (await _mediator.Send(new GetUserIdQuery())).Data;

            var entity = await _repositoryManager.AcademicYearRepository
                .GetByIdAsync(request.Id);

            if (entity == null)
                return NotFound<string>("السنة الدراسية غير موجودة");

            var name = request.Name.Trim();

            var exists = await _repositoryManager.AcademicYearRepository
                .IsNameExistExceptSelf(x =>
                    x.Id != request.Id && x.Name == name);

            if (exists)
                return BadRequest<string>("هذه السنة الدراسية موجودة بالفعل");

            entity.Name = name;
            entity.Order = request.Order;
            entity.UpdatedBy = currentUser;
            entity.UpdatedAt = DateTime.UtcNow;

            await _repositoryManager.SaveChangesAsync();

            return Success<string>(null, "تم تحديث السنة الدراسية بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("فشل في تحديث السنة الدراسية");
        }
    }

    public async Task<Response<string>> Handle(
        DeleteAcademicYearCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentUser =
                (await _mediator.Send(new GetUserIdQuery())).Data;

            var entity = await _repositoryManager.AcademicYearRepository
                .GetByIdAsync(request.Id);

            if (entity == null)
                return NotFound<string>("السنة الدراسية غير موجودة");

            var hasBanks = await _repositoryManager.QuestionBankRepository
                .IsNameExistExceptSelf(x => x.AcademicYearId == request.Id);

            if (hasBanks)
                return BadRequest<string>("لا يمكن حذف السنة الدراسية لأنها تحتوي على بنوك أسئلة");

            entity.IsDeleted = true;
            entity.DeletedBy = currentUser;
            entity.DeletedAt = DateTime.UtcNow;

            await _repositoryManager.SaveChangesAsync();

            return Deleted<string>("تم حذف السنة الدراسية بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ أثناء حذف السنة الدراسية");
        }
    }

    #endregion
}

public class AcademicYearQueryHandler : ResponseHandler,
    IRequestHandler<GetAcademicYearsQuery, Response<List<AcademicYearDTO>>>
{
    #region Fields
    private readonly IRepositoryManager _repositoryManager;
    #endregion

    #region Constructors
    public AcademicYearQueryHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
    }
    #endregion

    #region Handle Functions
    public async Task<Response<List<AcademicYearDTO>>> Handle(
        GetAcademicYearsQuery request,
        CancellationToken cancellationToken)
    {
        var years = await _repositoryManager.AcademicYearRepository
            .GetTableNoTracking()
            .OrderBy(x => x.Order)
            .ThenBy(x => x.Name)
            .Select(x => new AcademicYearDTO
            {
                Id = x.Id,
                Name = x.Name,
                Order = x.Order
            })
            .ToListAsync(cancellationToken);

        return Success(years);
    }
    #endregion
}