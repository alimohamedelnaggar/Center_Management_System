namespace CenterManagement.Core.Features.Auth.Profile.Query.Models;

public class GetMyProfileDto
{
    public Guid Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? PhoneNumber { get; set; }

    public string? UserName { get; set; }

    public string? Address { get; set; }

    public string? Code { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>Feature modules enabled for the user's center (empty for platform users).</summary>
    public string[] EnabledModules { get; set; } = [];

    /// <summary>
    /// Type of the user's center ("SoloTeacher" / "MultiTeacher"); null for
    /// platform users. Read from the DB on every call so an upgrade is picked
    /// up immediately without re-issuing the JWT.
    /// </summary>
    public string? CenterType { get; set; }

    /// <summary>Derived subscription state of the user's center, if any.</summary>
    public CenterManagement.Data.Results.SubscriptionInfoDto? Subscription { get; set; }

    /// <summary>Subject of the caller's own teacher profile, if they have one.
    /// Null for non-teachers and for teachers whose subject was never set (the
    /// UI prompts them to fill it in).</summary>
    public string? Subject { get; set; }
}