namespace CenterManagement.Core.Features.Shared.UploadImage.Commands.Models;

public class UploadImageCommand : IRequest<Response<string>>
{
    public IFormFile ImageFile { get; set; }
    public string FolderName { get; set; }
}
