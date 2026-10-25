using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Core.Features.IncomeFeature.Commands.Models;
using CenterManagement.Core.Features.IncomeFeature.Queries.Results;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Incomes;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.IncomeFeature.Commands.Handlers;

public class IncomeCommandHandler : ResponseHandler,
    IRequestHandler<AddIncomeCommand, Response<string>>,
    IRequestHandler<EditIncomeCommand, Response<string>>,
    IRequestHandler<DeleteIncomeCommand, Response<string>>
{
    #region Fields
    private readonly IMediator _mediator;
    private readonly IRepositoryManager _repositoryManager;
    private readonly IIncomeNotification _notificationService;
    private readonly IUserScopeService _scopeService;
    #endregion

    #region Constructors
    public IncomeCommandHandler(IRepositoryManager repositoryService,
                                IStringLocalizer<SharedResources> localizer,
                                IIncomeNotification notificationService,
                                IUserScopeService scopeService,
                                IMediator mediator) : base(localizer)
    {
        _repositoryManager = repositoryService;
        _notificationService = notificationService;
        _scopeService = scopeService;
        _mediator = mediator;
    }
    #endregion

    #region Handle Functions

    public async Task<Response<string>> Handle(AddIncomeCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = (await _mediator.Send(new GetUserIdQuery())).Data;

            var category = await _repositoryManager.IncomeCategoryRepository
                .GetByIdAsync(request.CategoryId);

            if (category is null || category.IsDeleted)
                return NotFound<string>("لا يوجد فئة خاصة بهذا الإيراد، برجاء إنشاء فئة للإيراد");

            var scope = await _scopeService.ResolveAsync(cancellationToken);

            if (request.GroupId.HasValue && !scope.Allows(request.GroupId.Value))
                return NotFound<string>("المجموعة غير موجودة.");

            var income = new Income
            {
                Name = request.Name.Trim(),
                CategoryId = request.CategoryId,
                Amount = request.Amount,
                IncomeDate = request.IncomeDate,
                Notes = request.Notes,
                GroupId = request.GroupId,
                CreatedBy = currentUser
            };

            await _repositoryManager.IncomeRepository.AddAsync(income);
            await _repositoryManager.SaveChangesAsync();

            #region SignalR
            var incomeDto = new IncomeDTO
            {
                Id = income.Id,
                Name = income.Name,
                CategoryName = category.Name,
                CategoryId = category.Id,
                Amount = income.Amount,
                IncomeDate = income.IncomeDate,
                Notes = income.Notes
            };

            await _notificationService.IncomeAddedAsync(incomeDto);
            #endregion

            return Success<string>(null, "تم إضافة الإيراد بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ أثناء حفظ الإيراد");
        }
    }

    public async Task<Response<string>> Handle(EditIncomeCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = (await _mediator.Send(new GetUserIdQuery())).Data;

            var income = await _repositoryManager.IncomeRepository
                .GetByIdAsync(request.Id);

            if (income is null || income.IsDeleted)
                return NotFound<string>("هذا الإيراد غير موجود");

            var category = await _repositoryManager.IncomeCategoryRepository
                .GetByIdAsync(request.CategoryId);

            if (category is null || category.IsDeleted)
                return NotFound<string>("لا يوجد فئة خاصة بهذا الإيراد، برجاء إنشاء فئة للإيراد");

            var scope = await _scopeService.ResolveAsync(cancellationToken);

            if (!scope.CenterWide
                && (income.GroupId is null || !scope.Allows(income.GroupId.Value)))
                return NotFound<string>("هذا الإيراد غير موجود");

            if (request.GroupId.HasValue && !scope.Allows(request.GroupId.Value))
                return NotFound<string>("المجموعة غير موجودة.");

            income.Name = request.Name.Trim();
            income.CategoryId = request.CategoryId;
            income.Amount = request.Amount;
            income.IncomeDate = request.IncomeDate;
            income.Notes = request.Notes;
            income.GroupId = request.GroupId;
            income.UpdatedAt = DateTime.UtcNow;
            income.UpdatedBy = currentUser;

            await _repositoryManager.SaveChangesAsync();

            #region SignalR
            var incomeDto = new IncomeDTO
            {
                Id = income.Id,
                Name = income.Name,
                CategoryName = category.Name,
                CategoryId = income.CategoryId,
                Amount = income.Amount,
                IncomeDate = income.IncomeDate,
                Notes = income.Notes
            };

            await _notificationService.IncomeUpdatedAsync(incomeDto);
            #endregion

            return Success<string>(null, "تم تحديث الإيراد بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("فشل في تحديث الإيراد");
        }
    }

    public async Task<Response<string>> Handle(DeleteIncomeCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = (await _mediator.Send(new GetUserIdQuery())).Data;

            var income = await _repositoryManager.IncomeRepository
                .GetByIdAsync(request.Id);

            if (income is null || income.IsDeleted)
                return NotFound<string>("هذا الإيراد غير موجود");

            var scope = await _scopeService.ResolveAsync(cancellationToken);

            if (!scope.CenterWide
                && (income.GroupId is null || !scope.Allows(income.GroupId.Value)))
                return NotFound<string>("هذا الإيراد غير موجود");

            income.IsDeleted = true;
            income.DeletedBy = currentUser;

            await _repositoryManager.SaveChangesAsync();

            #region SignalR
            await _notificationService.IncomeDeletedAsync(income.Id);
            #endregion

            return Deleted<string>("تم حذف الإيراد بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ أثناء حذف الإيراد، حاول مرة أخرى");
        }
    }

    #endregion
}