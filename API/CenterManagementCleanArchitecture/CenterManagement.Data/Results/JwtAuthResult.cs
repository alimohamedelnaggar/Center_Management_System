namespace CenterManagement.Data.Results
{
    public class JwtAuthResult
    {
        public string AccessToken { get; set; }
        public RefreshToken RefreshToken { get; set; }

        /// <summary>True when the account still uses a temporary password and
        /// must change it before using the application.</summary>
        public bool MustChangePassword { get; set; }

        /// <summary>Feature modules enabled for the user's center (empty for
        /// platform users without a center).</summary>
        public string[] EnabledModules { get; set; } = [];

        /// <summary>Derived subscription state of the user's center, if any.</summary>
        public SubscriptionInfoDto? Subscription { get; set; }
    }
    public class RefreshToken
    {
        public string UserName { get; set; }
        public string Email { get; set; }
        public string TokenString { get; set; }
        public DateTime ExpireAt { get; set; }
    }
}
