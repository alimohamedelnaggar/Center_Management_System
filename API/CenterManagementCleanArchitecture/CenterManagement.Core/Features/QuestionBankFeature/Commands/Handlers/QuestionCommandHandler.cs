using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Core.Features.QuestionBankFeature.Commands.Models;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.QuestionBankFeature.Commands.Handlers;

public class QuestionCommandHandler : ResponseHandler,
    IRequestHandler<AddQuestionCommand, Response<string>>,
    IRequestHandler<EditQuestionCommand, Response<string>>,
    IRequestHandler<DeleteQuestionCommand, Response<string>>
{
    #region Fields
    private readonly IRepositoryManager _repositoryManager;
    private readonly IMediator _mediator;
    #endregion

    #region Constructors
    public QuestionCommandHandler(
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
        AddQuestionCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentUser =
                (await _mediator.Send(new GetUserIdQuery())).Data;

            var bank = await _repositoryManager.QuestionBankRepository
                .GetByIdAsync(request.QuestionBankId);

            if (bank == null)
                return NotFound<string>("بنك الأسئلة غير موجود");

            var validationMessage = ValidateQuestion(
                request.Type,
                request.Text,
                request.ImageName,
                request.Options);

            if (validationMessage != null)
                return BadRequest<string>(validationMessage);

            var question = new Question
            {
                QuestionBankId = request.QuestionBankId,
                Type = request.Type,
                Text = NormalizeText(request.Text),
                ImageName = NormalizeText(request.ImageName),
                Mark = request.Mark > 0 ? request.Mark : 1,
                CreatedBy = currentUser,
                Options = BuildOptions(request.Options)
            };

            await _repositoryManager.QuestionRepository.AddAsync(question);

            await _repositoryManager.SaveChangesAsync();

            return Success<string>(null, "تم إضافة السؤال بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ أثناء حفظ السؤال");
        }
    }

    public async Task<Response<string>> Handle(
        EditQuestionCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentUser =
                (await _mediator.Send(new GetUserIdQuery())).Data;

            var question = await _repositoryManager.QuestionRepository
                .GetByIdWithIncludeAsync(request.Id, x => x.Options);

            if (question == null)
                return NotFound<string>("السؤال غير موجود");

            var validationMessage = ValidateQuestion(
                request.Type,
                request.Text,
                request.ImageName,
                request.Options);

            if (validationMessage != null)
                return BadRequest<string>(validationMessage);

            question.Type = request.Type;
            question.Text = NormalizeText(request.Text);
            question.ImageName = NormalizeText(request.ImageName);
            question.Mark = request.Mark > 0 ? request.Mark : 1;
            question.UpdatedBy = currentUser;
            question.UpdatedAt = DateTime.UtcNow;

            var existingOptions = question.Options
                .Where(o => !o.IsDeleted)
                .OrderBy(o => o.Order)
                .ToList();

            var incomingOptions = BuildOptions(request.Options);

            for (var i = incomingOptions.Count; i < existingOptions.Count; i++)
            {
                existingOptions[i].IsDeleted = true;
                existingOptions[i].DeletedAt = DateTime.UtcNow;
            }

            var newOptions = new List<QuestionOption>();

            for (var i = 0; i < incomingOptions.Count; i++)
            {
                if (i < existingOptions.Count)
                {
                    existingOptions[i].Order = i + 1;
                    existingOptions[i].Text = incomingOptions[i].Text;
                    existingOptions[i].IsCorrect = incomingOptions[i].IsCorrect;
                }
                else
                {
                    incomingOptions[i].Order = i + 1;
                    incomingOptions[i].QuestionId = question.Id;
                    newOptions.Add(incomingOptions[i]);
                }
            }

            if (newOptions.Count > 0)
                await _repositoryManager.QuestionRepository.AddOptionsAsync(newOptions);

            await _repositoryManager.SaveChangesAsync();

            return Success<string>(null, "تم تعديل السؤال بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("فشل في تعديل السؤال");
        }
    }

    public async Task<Response<string>> Handle(
        DeleteQuestionCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentUser =
                (await _mediator.Send(new GetUserIdQuery())).Data;

            var question = await _repositoryManager.QuestionRepository
                .GetByIdWithIncludeAsync(request.Id, x => x.Options);

            if (question == null)
                return NotFound<string>("السؤال غير موجود");

            foreach (var option in question.Options)
            {
                option.IsDeleted = true;
                option.DeletedAt = DateTime.UtcNow;
            }

            question.IsDeleted = true;
            question.DeletedBy = currentUser;
            question.DeletedAt = DateTime.UtcNow;

            await _repositoryManager.SaveChangesAsync();

            return Deleted<string>("تم حذف السؤال بنجاح");
        }
        catch (Exception)
        {
            return BadRequest<string>("حدث خطأ أثناء حذف السؤال");
        }
    }

    #endregion

    #region Helpers

    private static string? NormalizeText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return value.Trim();
    }

    private static List<QuestionOption> BuildOptions(
        List<QuestionOptionInput> options)
    {
        return options
            .Where(o => !string.IsNullOrWhiteSpace(o.Text))
            .Select((o, index) => new QuestionOption
            {
                Order = index + 1,
                Text = o.Text.Trim(),
                IsCorrect = o.IsCorrect
            })
            .ToList();
    }

    private static string? ValidateQuestion(
        QuestionType type,
        string? text,
        string? imageName,
        List<QuestionOptionInput> options)
    {
        if (string.IsNullOrWhiteSpace(text) &&
            string.IsNullOrWhiteSpace(imageName))
            return "اكتب نص السؤال أو ارفع صورة للسؤال";

        if (type == QuestionType.MultipleChoice)
        {
            var validOptions =
                options?.Where(o => !string.IsNullOrWhiteSpace(o.Text))
                    .ToList() ?? new List<QuestionOptionInput>();

            if (validOptions.Count == 0)
                return "أدخل اختيارات السؤال";

            var correctCount = validOptions.Count(o => o.IsCorrect);

            if (correctCount != 1)
                return "اختر إجابة صحيحة واحدة فقط";
        }

        if (type == QuestionType.TrueFalse)
        {
            var validOptions =
                options?.Where(o => !string.IsNullOrWhiteSpace(o.Text))
                    .ToList() ?? new List<QuestionOptionInput>();

            if (validOptions.Count != 2 || validOptions.Count(o => o.IsCorrect) != 1)
                return "حدد الإجابة الصحيحة (صح أو غلط)";
        }

        return null;
    }

    #endregion
}