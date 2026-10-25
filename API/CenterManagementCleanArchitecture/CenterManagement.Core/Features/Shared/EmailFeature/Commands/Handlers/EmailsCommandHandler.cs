
namespace CenterManagement.Core.Features.Shared.EmailFeature.Commands.Handlers;

public class EmailsCommandHandler : ResponseHandler, IRequestHandler<SendEmailCommand, Response<string>>
{
    #region Fields
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly EmailSettings _emailSettings;
    #endregion

    #region Constructors
    public EmailsCommandHandler(IStringLocalizer<SharedResources> stringLocalizer,
        IOptions<EmailSettings> emailOptions) : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _emailSettings = emailOptions.Value;
    }
    #endregion

    #region Handle Functions
    public async Task<Response<string>> Handle(SendEmailCommand request, CancellationToken cancellationToken)
    {
        var response = await SendEmailAsync(request.Email, request.Message, request.Subject);
        if (response)
            return Success<string>("");

        return BadRequest<string>(_stringLocalizer[SharedResourcesKeys.SendEmailFailed]);
    }


    public async Task<bool> SendEmailAsync
        (string email, string htmlMessage, string subject)
    {
        try
        {
            var host = _emailSettings.Host?.Trim() ?? string.Empty;
            var userName = _emailSettings.FromEmail?.Trim() ?? string.Empty;
            var password = _emailSettings.Password?.Trim() ?? string.Empty;
            if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(userName) || string.IsNullOrEmpty(password))
            {
                //throw new InvalidOperationException("SMTP Host, UserName, and Password must be configured in appsettings.json under Smtp.");

                return false;
            }

            using var client = new SmtpClient(host)
            {
                Port = _emailSettings.Port > 0 ? _emailSettings.Port : 587,
                EnableSsl = _emailSettings.EnableSsl?.ToLower() == "true",
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(userName, password)
            };

            using var mail = new MailMessage
            {
                From = new MailAddress(userName),
                Subject = subject,
                Body = htmlMessage,
                IsBodyHtml = true
            };

            mail.To.Add(email);

            await client.SendMailAsync(mail);

            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }


    #endregion
}
