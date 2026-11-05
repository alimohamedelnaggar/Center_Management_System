namespace CenterManagement.Data.Helpers;

public class EmailSettings
{
    public int Port { get; set; }
    public string Host { get; set; }
    public string FromEmail { get; set; }
    public string Password { get; set; }
    public string EnableSsl { get; set; }

    /// <summary>
    /// MailKit socket option: None, Auto, StartTls, StartTlsWhenAvailable or
    /// SslOnConnect. When empty, the port decides (465 = SslOnConnect,
    /// otherwise StartTls).
    /// </summary>
    public string SecureSocket { get; set; }
}
