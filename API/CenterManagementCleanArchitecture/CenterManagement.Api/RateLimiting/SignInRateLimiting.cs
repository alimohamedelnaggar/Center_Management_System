using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;

namespace CenterManagement.Api.RateLimiting;

/// <summary>
/// Marks an endpoint as protected by <see cref="SignInRateLimitingMiddleware"/>.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class SignInRateLimitedAttribute : Attribute;

/// <summary>
/// Brute-force protection for the sign-in endpoint. Every attempt passes two
/// independent fixed-window limiters: one keyed by the caller's IP address and
/// one keyed by the submitted phone number, so neither a single machine nor a
/// single account can be hammered quickly. Rejections return HTTP 429 with an
/// Arabic message and a <c>Retry-After</c> header.
/// </summary>
public sealed class SignInRateLimitingMiddleware
{
    public const int IpPermitLimit = 20;
    public const int UserPermitLimit = 5;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    private const string UnknownPartition = "unknown";

    private readonly RequestDelegate _next;
    private readonly PartitionedRateLimiter<string> _ipLimiter;
    private readonly PartitionedRateLimiter<string> _phoneLimiter;

    public SignInRateLimitingMiddleware(RequestDelegate next)
    {
        _next = next;

        _ipLimiter = PartitionedRateLimiter.Create<string, string>(key =>
            RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = IpPermitLimit,
                Window = Window,
                QueueLimit = 0,
                AutoReplenishment = true
            }));

        _phoneLimiter = PartitionedRateLimiter.Create<string, string>(key =>
            RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = UserPermitLimit,
                Window = Window,
                QueueLimit = 0,
                AutoReplenishment = true
            }));
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.GetEndpoint()?.Metadata.GetMetadata<SignInRateLimitedAttribute>() is null)
        {
            await _next(context);
            return;
        }

        var ip = context.Connection.RemoteIpAddress?.ToString() ?? UnknownPartition;
        using var ipLease = _ipLimiter.AttemptAcquire(ip);

        if (!ipLease.IsAcquired)
        {
            await WriteRejectedAsync(context, ipLease);
            return;
        }

        var phone = await GetPhoneNumberAsync(context);
        using var phoneLease = _phoneLimiter.AttemptAcquire(phone);

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
    /// Reads the phone number from the JSON request body without consuming it
    /// (the body is buffered and rewound so MVC can still bind the command).
    /// </summary>
    private static async Task<string> GetPhoneNumberAsync(HttpContext context)
    {
        try
        {
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

            if (document.RootElement.ValueKind == JsonValueKind.Object &&
                document.RootElement.TryGetProperty("phoneNumber", out var phone) &&
                phone.ValueKind == JsonValueKind.String)
            {
                var value = phone.GetString();
                return string.IsNullOrWhiteSpace(value) ? UnknownPartition : value.Trim();
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
