using CenterManagement.Application.Features.Incomes.DTOs;
using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Core.Features.IncomeCategoryFeature.Queries.Results;
using CenterManagement.Data.Entities.Incomes;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Incomes.IncomeCategoryFeature.Commands;

public class IncomeCategoryCommandHandler : ResponseHandler,
    IRequestHandler<AddIncomeCategoryCommand, Bases.Response<string>>,
    IRequestHandler<EditIncomeCategoryCommand, Bases.Response<string>>,
    IRequestHandler<DeleteIncomeCategoryCommand, Bases.Response<string>>
{
    #region Fields
    private readonly IMediator _mediator;
    private readonly IRepositoryManager _repositoryManager;
    private readonly IIncomeCategoryNotification _notificationService;
    #endregion

    #region Constructors
    public IncomeCategoryCommandHandler(IRepositoryManager repositoryService,
                                        IStringLocalizer<SharedResources> localizer,
                                        IIncomeCategoryNotification notificationService,
                                        IMediator mediator) : base(localizer)
    {
        _repositoryManager = repositoryService;
        _notificationService = notificationService;
        _mediator = mediator;
    }
    #endregion

    #region Handle Functions

    public async Task<Bases.Response<string>> Handle(AddIncomeCategoryCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var _currentUser = (await _mediator.Send(new GetUserIdQuery())).Data;

            var incomeCategory = new IncomeCategory
            {
                Name = request.Name.Trim(),
                CreatedBy = _currentUser
            };

            await _repositoryManager.IncomeCategoryRepository.AddAsync(incomeCategory);

            await _repositoryManager.SaveChangesAsync();

            // SignalR
            await _notificationService.IncomeCategoryAddedAsync(
                new IncomeCategoryDTO
                {
                    Id = incomeCategory.Id,
                    Name = incomeCategory.Name
                });

            return Success<string>(null, "تم إضافة الفئة بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ أثناء حفظ الفئة");
        }
    }

    public async Task<Bases.Response<string>> Handle(EditIncomeCategoryCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var _currentUser = (await _mediator.Send(new GetUserIdQuery())).Data;

            var incomeCategory = await _repositoryManager.IncomeCategoryRepository
                .GetByIdAsync(request.Id);

            if (incomeCategory is null || incomeCategory.IsDeleted)
                return NotFound<string>("لا توجد فئة، برجاء إنشاء فئة أولاً");

            incomeCategory.Name = request.Name.Trim();
            incomeCategory.UpdatedBy = _currentUser;
            incomeCategory.UpdatedAt = DateTime.UtcNow;

            await _repositoryManager.SaveChangesAsync();

            // SignalR
            await _notificationService.IncomeCategoryUpdatedAsync(
                new IncomeCategoryDTO
                {
                    Id = incomeCategory.Id,
                    Name = incomeCategory.Name
                });

            return Success<string>(null, "تم تحديث الفئة بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("فشل في تحديث الفئة");
        }
    }

    public async Task<Bases.Response<string>> Handle(DeleteIncomeCategoryCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var _currentUser = (await _mediator.Send(new GetUserIdQuery())).Data;

            var incomeCategory = await _repositoryManager.IncomeCategoryRepository
                .GetByIdAsync(request.Id);

            if (incomeCategory is null || incomeCategory.IsDeleted)
                return NotFound<string>("هذه الفئة غير موجودة");

            incomeCategory.IsDeleted = true;
            incomeCategory.DeletedBy = _currentUser;

            await _repositoryManager.SaveChangesAsync();

            // SignalR
            await _notificationService.IncomeCategoryDeletedAsync(request.Id);

            return Deleted<string>("تم حذف الفئة بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ أثناء حذف الفئة، حاول مرة أخرى");
        }
    }

    #endregion
}