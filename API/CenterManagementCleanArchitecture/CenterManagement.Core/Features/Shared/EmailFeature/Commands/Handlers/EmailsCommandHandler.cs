using CenterManagement.Core.Features.Shared.EmailFeature.Senders;

namespace CenterManagement.Core.Features.Shared.EmailFeature.Commands.Handlers;

public class EmailsCommandHandler : ResponseHandler, IRequestHandler<SendEmailCommand, Response<string>>
{
    #region Fields
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly IEmailSender _emailSender;
    #endregion

    #region Constructors
    public EmailsCommandHandler(
        IStringLocalizer<SharedResources> stringLocalizer,
        IEmailSender emailSender) : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _emailSender = emailSender;
    }
    #endregion

    #region Handle Functions
    public async Task<Response<string>> Handle(SendEmailCommand request, CancellationToken cancellationToken)
    {
        var response = await _emailSender.SendAsync(
            request.Email,
            request.Message,
            request.Subject,
            cancellationToken);

        if (response)
            return Success<string>("");

        return BadRequest<string>(_stringLocalizer[SharedResourcesKeys.SendEmailFailed]);
    }

    #endregion
}
