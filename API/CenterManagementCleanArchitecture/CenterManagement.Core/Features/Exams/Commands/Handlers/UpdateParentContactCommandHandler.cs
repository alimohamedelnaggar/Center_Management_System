using CenterManagement.Core.Features.Exams.Commands.Models;
using CenterManagement.Data.Entities.Exams;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Exams.Commands.Handlers;

public class UpdateParentContactCommandHandler :
    ResponseHandler,
    IRequestHandler<UpdateParentContactCommand, Response<bool>>
{
    private readonly IRepositoryManager _repositoryManager;

    public UpdateParentContactCommandHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _repositoryManager = repositoryManager;
    }

    public async Task<Response<bool>> Handle(
        UpdateParentContactCommand request,
        CancellationToken cancellationToken)
    {
        var repository =
            _repositoryManager.StudentExamParentContactRepository;

        var contact = await repository.GetByStudentAndExamAsync(
            request.StudentId,
            request.ExamId,
            cancellationToken);

        if (contact is null)
        {
            contact = new StudentExamParentContact
            {
                Id = Guid.NewGuid(),
                StudentId = request.StudentId,
                ExamId = request.ExamId,
                IsContacted = true,
                ContactedAt = DateTime.Now
            };

            await repository.AddAsync(contact);
        }
        else
        {
            contact.IsContacted = !contact.IsContacted;

            contact.ContactedAt = contact.IsContacted
                ? DateTime.Now
                : null;

            await repository.UpdateAsync(contact);
        }

        await _repositoryManager.SaveChangesAsync();

        return Success(contact.IsContacted);
    }
}