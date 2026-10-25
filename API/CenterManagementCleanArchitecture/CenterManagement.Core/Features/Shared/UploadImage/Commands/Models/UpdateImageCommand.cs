namespace CenterManagement.Core.Features.Shared.UploadImage.Commands.Models;

public class UpdateImageCommand : IRequest<Response<string>>
{
    public IFormFile NewFile { get; set; }
    public string OldImageName { get; set; }
    public string FolderName { get; set; }
}
