using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Core.Features.ExpenseCategoryFeature.Queries.Results;
using CenterManagement.Core.Features.ExpenseCategoryFeature.Students.Commands.Models;
using CenterManagement.Data.Entities.Expenses;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.ExpenseCategoryCategoryFeature.Students.Commands.Handlers;

public class ExpenseCategoryCommandHandler : ResponseHandler,
    IRequestHandler<AddExpenseCategoryCommand, Bases.Response<string>>,
    IRequestHandler<EditExpenseCategoryCommand, Bases.Response<string>>,
    IRequestHandler<DeleteExpenseCategoryCommand, Bases.Response<string>>
{
    #region Fields
    private readonly IMediator _mediator;
    private readonly IRepositoryManager _repositoryManager;
    private readonly IExpenseCategoryNotification _notificationService;
    #endregion

    #region Constructors
    public ExpenseCategoryCommandHandler(IRepositoryManager repositoryService,
                                 IStringLocalizer<SharedResources> localizer,
                                 IExpenseCategoryNotification notificationService,
                                 IMediator mediator) : base(localizer)
    {
        _repositoryManager = repositoryService;
        _notificationService = notificationService;
        _mediator = mediator;
    }
    #endregion


    #region Handle Functions

    public async Task<Bases.Response<string>> Handle(AddExpenseCategoryCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var _currentUser = (await _mediator.Send(new GetUserIdQuery())).Data;

            var ExpenseCategory = new ExpenseCategory
            {
                Name = request.Name.Trim(),
                CreatedBy = _currentUser
            };

            await _repositoryManager.ExpenseCategoryRepository.AddAsync(ExpenseCategory);

            await _repositoryManager.SaveChangesAsync();

            //signalR
            await _notificationService.ExpenseCategoryAddedAsync(
                new ExpenseCategoryDTO
                {
                    Id = ExpenseCategory.Id,
                    Name = ExpenseCategory.Name
                });

            return Success<string>(null, "تم اضافة الفئة بنجاح");
        }
        catch (Exception ex)
        {
            return BadRequest<string>("حدث خطأ اثناء حفظ الفئة");
        }
    }


    public async Task<Bases.Response<string>> Handle(EditExpenseCategoryCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var _currentUser = (await _mediator.Send(new GetUserIdQuery())).Data;

            var ExpenseCategory = await _repositoryManager.ExpenseCategoryRepository
            .GetByIdAsync(request.Id);


            if (ExpenseCategory is null || ExpenseCategory.IsDeleted)
                return NotFound<string>("لا يوجد فئة,برجاء انشاء فئة ");

            ExpenseCategory.Name = request.Name.Trim();
            ExpenseCategory.UpdatedBy = _currentUser;
            ExpenseCategory.UpdatedAt = DateTime.UtcNow;

            await _repositoryManager.SaveChangesAsync();


            // SignalR
            await _notificationService.ExpenseCategoryUpdatedAsync(
                new ExpenseCategoryDTO
                {
                    Id = ExpenseCategory.Id,
                    Name = ExpenseCategory.Name
                });

            return Success<string>(null, "تم تحديث الفئة بنجاح");
        }
        catch (Exception ex)
        {

            return BadRequest<string>("فشل في تحديث المصرب");
        }
    }


    public async Task<Bases.Response<string>> Handle(DeleteExpenseCategoryCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var _currentUser = (await _mediator.Send(new GetUserIdQuery())).Data;
            var ExpenseCategory = await _repositoryManager.ExpenseCategoryRepository
                .GetByIdAsync(request.Id);

            if (ExpenseCategory is null)
                return NotFound<string>("هذا الفئة لا يوجد");

            ExpenseCategory.IsDeleted = true;
            ExpenseCategory.DeletedBy = _currentUser;
            await _repositoryManager.SaveChangesAsync();

            //SignalR
            await _notificationService.ExpenseCategoryDeletedAsync(request.Id);

            return Deleted<string>("تم حذف الفئة");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ اثناء حذف الفئة, حاول مرة اخري");
        }

    }
    #endregion

}
