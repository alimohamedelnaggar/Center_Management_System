namespace CenterManagement.Core.Features.Shared.EncryptionProvider.Commands.Models;


public class EncryptionProviderCommand : IRequest<Response<string>>
{
    public string Data { get; set; }
}
