
namespace CenterManagement.Core.Features.Shared.UploadImage.Commands.Handlers;

public class UploadImageCommandHandler :
    ResponseHandler,
    IRequestHandler<UploadImageCommand, Response<string>>,
    IRequestHandler<UpdateImageCommand, Response<string>>,
    IRequestHandler<DeleteImageCommand, Response<bool>>
{
    #region Fields
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly IDataProtector _protector;

    #endregion

    #region Constructors
    public UploadImageCommandHandler(IStringLocalizer<SharedResources> stringLocalizer,
        IDataProtectionProvider dataProtectionProvider) : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _protector = dataProtectionProvider.CreateProtector("CenterManagementSecureKeyCenterManagementSecureKey");
    }
    #endregion

    #region Handle Functions
    public async Task<Response<string>> Handle(UploadImageCommand request, CancellationToken cancellationToken)
    {
        var imageName = await UploadImageAsync(request.ImageFile, request.FolderName);
        return Success(imageName);
    }

    public async Task<Response<string>> Handle(UpdateImageCommand request, CancellationToken cancellationToken)
    {

        await DeleteImageAsync(request.OldImageName, request.FolderName);

        var imageName = await UploadImageAsync(request.NewFile, request.FolderName);
        return Success(imageName);
    }

    public async Task<Response<bool>> Handle(DeleteImageCommand request, CancellationToken cancellationToken)
    {
        var result = await DeleteImageAsync(request.imageName, request.folderName);
        return Success(result);
    }

    public async Task<string?> UploadImageAsync(IFormFile file, string folderName)
    {
        if (file == null || file.Length == 0)
            return null;

        var allowedExtensions =
            new[] { ".jpg", ".jpeg", ".png", ".webp" };

        var extension = Path.GetExtension(file.FileName).ToLower();

        if (!allowedExtensions.Contains(extension))
            throw new Exception("Invalid image extension");

        var folderPath = Path.Combine(
            Directory.GetCurrentDirectory(),
            "wwwroot",
            "images",
            folderName);

        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        var imageName =
            $"{Guid.NewGuid()}{extension}";

        var filePath = Path.Combine(folderPath, imageName);

        using var stream =
            new FileStream(filePath, FileMode.Create);

        await file.CopyToAsync(stream);

        return imageName;
    }

    public async Task<bool> DeleteImageAsync(string imageName, string folderName)
    {
        if (string.IsNullOrWhiteSpace(imageName))
            return false;
        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", folderName, imageName);

        if (!File.Exists(filePath))
            return false;

        await Task.Run(() => File.Delete(filePath));

        return true;
    }



    #endregion
}
