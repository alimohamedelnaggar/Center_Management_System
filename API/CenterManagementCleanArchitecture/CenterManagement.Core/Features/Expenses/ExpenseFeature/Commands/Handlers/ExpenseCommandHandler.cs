using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Core.Features.ExpenseFeature.Students.Commands.Models;
using CenterManagement.Core.Features.ExpenseFeature.Students.Queries.Results;
using CenterManagement.Data.Entities.Expenses;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Handlers;

public class ExpenseCommandHandler : ResponseHandler,
    IRequestHandler<AddExpenseCommand, Bases.Response<string>>,
IRequestHandler<EditExpenseCommand, Bases.Response<string>>,
IRequestHandler<DeleteExpenseCommand, Bases.Response<string>>
{
    #region Fields
    private readonly IMediator _mediator;
    private readonly IRepositoryManager _repositoryManager;
    private readonly IExpenseNotification _notificationService;
    #endregion

    #region Constructors
    public ExpenseCommandHandler(IRepositoryManager repositoryService,
                                 IStringLocalizer<SharedResources> localizer,
                                 IExpenseNotification notificationService,
                                 IMediator mediator) : base(localizer)
    {
        _repositoryManager = repositoryService;
        _notificationService = notificationService;
        _mediator = mediator;
    }
    #endregion


    #region Handle Functions

    public async Task<Response<string>> Handle(AddExpenseCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var _currentUser = (await _mediator.Send(new GetUserIdQuery())).Data;

            var category = await _repositoryManager.ExpenseCategoryRepository
                  .GetByIdAsync(request.CategoryId);

            if (category is null || category.IsDeleted)
                return NotFound<string>("لا يوجد فئة خاصة بهذا المصروف,برجاء انشاء فئة للمصروف");

            var expense = new Expense
            {
                Name = request.Name.Trim(),
                CategoryId = request.CategoryId,
                Amount = request.Amount,
                ExpenseDate = request.ExpenseDate,
                Notes = request.Notes,
                CreatedBy = _currentUser
            };

            await _repositoryManager.ExpenseRepository.AddAsync(expense);

            await _repositoryManager.SaveChangesAsync();

            #region SignalR
            var expenseDto = new ExpenseDTO
            {
                Id = expense.Id,
                Name = expense.Name,
                CategoryName = category.Name,
                Amount = expense.Amount,
                ExpenseDate = expense.ExpenseDate,
                Notes = expense.Notes
            };

            await _notificationService.ExpenseAddedAsync(expenseDto);

            #endregion

            return Success<string>(null, "تم اضافة المصروف بنجاح");
        }
        catch (Exception ex)
        {
            return BadRequest<string>("حدث خطأ اثناء حفظ المصروف");
        }
    }


    public async Task<Bases.Response<string>> Handle(EditExpenseCommand request, CancellationToken cancellationToken)
    {

        try
        {
            var _currentUser = (await _mediator.Send(new GetUserIdQuery())).Data;

            var expense = await _repositoryManager.ExpenseRepository
            .GetByIdAsync(request.Id);

            if (expense is null)
                return NotFound<string>("هذا المصروف لا يوجد");

            var category = await _repositoryManager.ExpenseCategoryRepository
                .GetByIdAsync(request.CategoryId);

            if (category is null || category.IsDeleted)
                return NotFound<string>("لا يوجد فئة خاصة بهذا المصروف,برجاء انشاء فئة للمصروف");

            expense.Name = request.Name.Trim();
            expense.CategoryId = request.CategoryId;
            expense.Amount = request.Amount;
            expense.ExpenseDate = request.ExpenseDate;
            expense.Notes = request.Notes;
            expense.UpdatedAt = DateTime.UtcNow;
            expense.UpdatedBy = _currentUser;


            await _repositoryManager.SaveChangesAsync();

            #region SignalR
            var expenseDto = new ExpenseDTO
            {
                Id = expense.Id,
                Name = expense.Name,
                CategoryName = category.Name,
                CategoryId= expense.CategoryId,
                Amount = expense.Amount,
                ExpenseDate = expense.ExpenseDate,
                Notes = expense.Notes
            };

            await _notificationService.ExpenseUpdatedAsync(expenseDto);
            #endregion

            return Success<string>(null, "تم تحديث المصروف بنجاح");
        }
        catch (Exception ex)
        {

            return BadRequest<string>("فشل في تحديث المصرب");
        }
    }


    public async Task<Bases.Response<string>> Handle(DeleteExpenseCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var _currentUser = (await _mediator.Send(new GetUserIdQuery())).Data;
            var expense = await _repositoryManager.ExpenseRepository
                .GetByIdAsync(request.Id);

            if (expense is null)
                return NotFound<string>("هذا المصروف لا يوجد");

            expense.IsDeleted = true;
            expense.DeletedBy = _currentUser;

            await _repositoryManager.SaveChangesAsync();

            //signalR
            await _notificationService.ExpenseDeletedAsync(expense.Id);

            return Deleted<string>("تم حذف المصروف");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ اثناء حذف المصروف, حاول مرة اخري");

        }

    }
    #endregion

}
