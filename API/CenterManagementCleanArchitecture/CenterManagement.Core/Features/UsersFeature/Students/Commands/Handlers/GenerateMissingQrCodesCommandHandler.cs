using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Handlers;

public class GenerateMissingQrCodesCommandHandler : ResponseHandler,
    IRequestHandler<GenerateMissingQrCodesCommand, Response<string>>
{
    private readonly IRepositoryManager _repositoryManager;

    public GenerateMissingQrCodesCommandHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> localizer) : base(localizer)
    {
        _repositoryManager = repositoryManager;
    }

    public async Task<Response<string>> Handle(
        GenerateMissingQrCodesCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var students = await _repositoryManager.StudentRepository
                .GetTableTracking()
                .Where(x => x.QrCode == null || x.QrCode == string.Empty)
                .ToListAsync(cancellationToken);

            if (students.Count == 0)
                return Success<string>("كل الطلاب عندهم كود بالفعل.");

            var taken = (await _repositoryManager.StudentRepository
                    .GetTableNoTracking()
                    .Where(x => x.QrCode != null && x.QrCode != string.Empty)
                    .Select(x => x.QrCode!)
                    .ToListAsync(cancellationToken))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var assigned = 0;

            foreach (var student in students)
            {
                for (var attempt = 0; attempt < 12; attempt++)
                {
                    var code = StudentQrCodeGenerator.Generate();

                    if (taken.Contains(code))
                        continue;

                    student.QrCode = code;
                    taken.Add(code);
                    assigned++;
                    break;
                }
            }

            await _repositoryManager.SaveChangesAsync();

            return Success<string>($"تم توليد {assigned} كود للطلاب.");
        }
        catch (Exception ex)
        {
            return BadRequest<string>(ex.Message);
        }
    }
}