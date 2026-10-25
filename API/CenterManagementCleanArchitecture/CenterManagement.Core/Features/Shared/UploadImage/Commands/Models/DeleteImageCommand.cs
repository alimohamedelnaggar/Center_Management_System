namespace CenterManagement.Core.Features.Shared.UploadImage.Commands.Models;

public class DeleteImageCommand : IRequest<Response<bool>>
{
    public string imageName { get; set; }
    public string folderName { get; set; }
}