namespace CenterManagement.Core.Features.Shared.UploadImage.Query.Models;

public class GetImageQuery : IRequest<Response<string>>
{
    public string ImageName { get; set; }
    public string FolderName { get; set; }
    public HttpRequest Request { get; set; }
}