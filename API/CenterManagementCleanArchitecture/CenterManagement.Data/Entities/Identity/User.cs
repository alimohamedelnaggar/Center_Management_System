using CenterManagement.Data.Entities.Groups;
using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace CenterManagement.Data.Entities.Identity;

public class User : IdentityUser<Guid>
{
    public User()
    {
        UserRefreshTokens = new HashSet<UserRefreshToken>();
    }
    public string FullName { get; set; }
    public string? Address { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public string? Code { get; set; }

    // Out-of-band password-reset challenge. The plaintext code is never stored;
    // only a salted hash plus its expiry/attempt bookkeeping.
    public string? ResetCodeHash { get; set; }
    public DateTime? ResetCodeExpiresAt { get; set; }
    public int ResetCodeAttempts { get; set; }
    public DateTime? ResetCodeSentAt { get; set; }

    public bool IsActive { get; set; } = true;
    public bool MustChangePassword { get; set; }
    public bool IsCenterAdmin { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public bool IsDeleted { get; set; }

    public Guid? CenterId { get; set; }
    public virtual Center? Center { get; set; }

    [InverseProperty(nameof(UserRefreshToken.User))]
    public virtual ICollection<UserRefreshToken> UserRefreshTokens { get; set; }
    public virtual ICollection<TeacherGroup> TeacherGroups { get; set; } = new HashSet<TeacherGroup>();
}
