using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace CenterManagement.Api.RateLimiting;

/// <summary>
/// Marks an endpoint as protected by <see cref="SignInRateLimitingMiddleware"/>.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class SignInRateLimitedAttribute : Attribute;

/// <summary>
/// Marks an account-recovery endpoint (send code / reset password) as protected
/// by <see cref="SignInRateLimitingMiddleware"/>. Recovery gets its own budget so
/// the five-attempt code rule can be exercised through the same identifier
/// without the transport limiter firing first.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class RecoveryRateLimitedAttribute : Attribute;

/// <summary>
/// Brute-force protection for the sign-in and account-recovery endpoints. Every
/// attempt passes two independent fixed-window limiters: one keyed by the
/// caller's IP address and one keyed by the submitted account identifier
/// (email or phone), so neither a single machine nor a single account can be
/// hammered quickly. Rejections return HTTP 429 with an Arabic message and a
/// <c>Retry-After</c> header.
///
/// Limits are configurable through <c>RateLimiting:SignIn</c> so the E2E
/// environment can disable them; defaults preserve production behaviour.
/// </summary>
public sealed class SignInRateLimitingMiddleware
{
    public const int IpPermitLimit = 20;
    public const int UserPermitLimit = 5;
    public const int RecoveryIpPermitLimit = 20;
    public const int RecoveryUserPermitLimit = 10;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    private const string UnknownPartition = "unknown";

    private readonly RequestDelegate _next;
    private readonly bool _enabled;
    private readonly PartitionedRateLimiter<string>? _ipLimiter;
    private readonly PartitionedRateLimiter<string>? _phoneLimiter;
    private readonly PartitionedRateLimiter<string>? _recoveryIpLimiter;
    private readonly PartitionedRateLimiter<string>? _recoveryIdentifierLimiter;

    public SignInRateLimitingMiddleware(
        RequestDelegate next,
        IConfiguration configuration)
    {
        _next = next;

        var section = configuration.GetSection("RateLimiting:SignIn");
        _enabled = section.GetValue("Enabled", true);

        if (!_enabled)
            return;

        (_ipLimiter, _phoneLimiter) = CreateLimiters(
            section,
            IpPermitLimit,
            UserPermitLimit);

        (_recoveryIpLimiter, _recoveryIdentifierLimiter) = CreateLimiters(
            configuration.GetSection("RateLimiting:Recovery"),
            RecoveryIpPermitLimit,
            RecoveryUserPermitLimit);
    }

    private static (
        PartitionedRateLimiter<string> Ip,
        PartitionedRateLimiter<string> Identifier) CreateLimiters(
        IConfigurationSection section,
        int defaultIpLimit,
        int defaultUserLimit)
    {
        var ipLimit = Math.Max(1, section.GetValue("IpPermitLimit", defaultIpLimit));
        var userLimit = Math.Max(1, section.GetValue("UserPermitLimit", defaultUserLimit));
        var windowSeconds = Math.Max(1, section.GetValue("WindowSeconds", (int)Window.TotalSeconds));
        var window = TimeSpan.FromSeconds(windowSeconds);

        var ip = PartitionedRateLimiter.Create<string, string>(key =>
            RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = ipLimit,
                Window = window,
                QueueLimit = 0,
                AutoReplenishment = true
            }));

        var identifier = PartitionedRateLimiter.Create<string, string>(key =>
            RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = userLimit,
                Window = window,
                QueueLimit = 0,
                AutoReplenishment = true
            }));

        return (ip, identifier);
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!_enabled)
        {
            await _next(context);
            return;
        }

        var endpoint = context.GetEndpoint();
        var isSignIn = endpoint?.Metadata.GetMetadata<SignInRateLimitedAttribute>() is not null;
        var isRecovery = endpoint?.Metadata.GetMetadata<RecoveryRateLimitedAttribute>() is not null;

        if (!isSignIn && !isRecovery)
        {
            await _next(context);
            return;
        }

        var ipLimiter = isRecovery ? _recoveryIpLimiter! : _ipLimiter!;
        var identifierLimiter = isRecovery ? _recoveryIdentifierLimiter! : _phoneLimiter!;

        var ip = context.Connection.RemoteIpAddress?.ToString() ?? UnknownPartition;
        using var ipLease = ipLimiter.AttemptAcquire(ip);

        if (!ipLease.IsAcquired)
        {
            await WriteRejectedAsync(context, ipLease);
            return;
        }

        var phone = await GetPartitionKeyAsync(context);
        using var phoneLease = identifierLimiter.AttemptAcquire(phone);

        if (!phoneLease.IsAcquired)
        {
            await WriteRejectedAsync(context, phoneLease);
            return;
        }

        await _next(context);
    }

    private static async Task WriteRejectedAsync(HttpContext context, RateLimitLease lease)
    {
        var response = context.Response;
        response.StatusCode = StatusCodes.Status429TooManyRequests;
        response.ContentType = "application/json; charset=utf-8";

        if (lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            response.Headers.RetryAfter =
                ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString();
        }

        await response.WriteAsJsonAsync(new
        {
            succeeded = false,
            statusCode = StatusCodes.Status429TooManyRequests,
            message = "عدد المحاولات كبير. الرجاء المحاولة مرة أخرى بعد قليل."
        });
    }

    /// <summary>
    /// Reads the account identifier (email or phone) from the JSON request body
    /// or the query string without consuming the body (the body is buffered and
    /// rewound so MVC can still bind the command). Recovery endpoints accept an
    /// email or a phone, so both names are honoured.
    /// </summary>
    private static async Task<string> GetPartitionKeyAsync(HttpContext context)
    {
        try
        {
            var fromQuery = context.Request.Query["identifier"].FirstOrDefault()
                            ?? context.Request.Query["email"].FirstOrDefault()
                            ?? context.Request.Query["phoneNumber"].FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(fromQuery))
                return fromQuery.Trim();

            if (!context.Request.Body.CanRead)
                return UnknownPartition;

            context.Request.EnableBuffering();
            context.Request.Body.Position = 0;

            using var reader = new StreamReader(
                context.Request.Body,
                Encoding.UTF8,
                detectEncodingFromByteOrderMarks: false,
                leaveOpen: true);

            var body = await reader.ReadToEndAsync();
            context.Request.Body.Position = 0;

            if (string.IsNullOrWhiteSpace(body))
                return UnknownPartition;

            using var document = JsonDocument.Parse(body);

            if (document.RootElement.ValueKind != JsonValueKind.Object)
                return UnknownPartition;

            foreach (var name in new[] { "identifier", "email", "phoneNumber" })
            {
                if (document.RootElement.TryGetProperty(name, out var value) &&
                    value.ValueKind == JsonValueKind.String)
                {
                    var candidate = value.GetString();
                    if (!string.IsNullOrWhiteSpace(candidate))
                        return candidate.Trim();
                }
            }
        }
        catch
        {
            // A malformed body must never break the pipeline. Fall back to a
            // shared bucket so the request is still throttled.
        }

        return UnknownPartition;
    }
}
