namespace CenterManagement.Core.Features.Shared.EncryptionProvider.Commands.Models;

public class DecryptionProviderCommand : IRequest<Response<string>>
{
    public string Data { get; set; }
}