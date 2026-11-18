using System.Threading.RateLimiting;
using CenterManagement.Data.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace CenterManagement.Api.RateLimiting;

/// <summary>
/// Marks the public student-card endpoint as protected by
/// <see cref="StudentCardRateLimitingMiddleware"/>.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class StudentCardRateLimitedAttribute : Attribute;

/// <summary>
/// Anti-enumeration protection for the anonymous student-card lookup. A card
/// code is the only secret a parent presents, so the endpoint must not let a
/// caller try codes quickly. Three independent fixed-window limiters apply:
/// <list type="bullet">
/// <item>per client IP across every request (default 30/minute),</item>
/// <item>per submitted code across every IP (default 10/minute), so a single
/// code cannot be hammered,</item>
/// <item>per client IP for requests that end in "no such student"
/// (default 10/minute), so wrong guesses are the most expensive.</item>
/// </list>
/// Rejections return HTTP 429 with an Arabic message and a
/// <c>Retry-After</c> header, matching the sign-in limiter's contract.
///
/// The miss limiter is charged after the handler runs, because only the
/// result tells us whether the code exists. The response is buffered for the
/// duration of the call so a 404 can still be replaced by a 429 before any
/// byte reaches the client.
///
/// Limits are configurable through <c>RateLimiting:StudentCard</c>; defaults
/// preserve production behaviour. Codes and IPs are never logged.
/// </summary>
public sealed class StudentCardRateLimitingMiddleware
{
    public const int IpPermitLimit = 30;
    public const int CodePermitLimit = 10;
    public const int MissPermitLimit = 10;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    private const string UnknownPartition = "unknown";
    private const string InvalidCodePartition = "invalid-code";
    private const string RejectionMessage =
        "عدد المحاولات كبير. الرجاء المحاولة مرة أخرى بعد قليل.";

    private readonly RequestDelegate _next;
    private readonly bool _enabled;
    private readonly PartitionedRateLimiter<string>? _ipLimiter;
    private readonly PartitionedRateLimiter<string>? _codeLimiter;
    private readonly PartitionedRateLimiter<string>? _missLimiter;

    public StudentCardRateLimitingMiddleware(
        RequestDelegate next,
        IConfiguration configuration)
    {
        _next = next;

        var section = configuration.GetSection("RateLimiting:StudentCard");
        _enabled = section.GetValue("Enabled", true);

        if (!_enabled)
            return;

        var window = TimeSpan.FromSeconds(
            Math.Max(1, section.GetValue("WindowSeconds", (int)Window.TotalSeconds)));

        _ipLimiter = CreateLimiter(section, "IpPermitLimit", IpPermitLimit, window);
        _codeLimiter = CreateLimiter(section, "CodePermitLimit", CodePermitLimit, window);
        _missLimiter = CreateLimiter(section, "MissPermitLimit", MissPermitLimit, window);
    }

    private static PartitionedRateLimiter<string> CreateLimiter(
        IConfigurationSection section,
        string key,
        int defaultPermitLimit,
        TimeSpan window)
    {
        var permitLimit = Math.Max(1, section.GetValue(key, defaultPermitLimit));

        return PartitionedRateLimiter.Create<string, string>(partitionKey =>
            RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = window,
                QueueLimit = 0,
                AutoReplenishment = true
            }));
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!_enabled)
        {
            await _next(context);
            return;
        }

        var endpoint = context.GetEndpoint();
        if (endpoint?.Metadata.GetMetadata<StudentCardRateLimitedAttribute>() is null)
        {
            await _next(context);
            return;
        }

        // Every request from the same caller shares one budget, whether the
        // code exists or not.
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? UnknownPartition;
        using var ipLease = _ipLimiter!.AttemptAcquire(ip);

        if (!ipLease.IsAcquired)
        {
            await WriteRejectedAsync(context, ipLease);
            return;
        }

        // One bucket per well-formed code. Anything malformed shares a single
        // bucket so a caller cannot grow the limiter dictionary with garbage.
        var code = ResolveCodePartition(context);
        using var codeLease = _codeLimiter!.AttemptAcquire(code);

        if (!codeLease.IsAcquired)
        {
            await WriteRejectedAsync(context, codeLease);
            return;
        }

        // The handler decides whether the code exists, so the response has to
        // be buffered: only then can a miss be counted and, when the miss
        // budget is exhausted, answered with 429 instead of 404.
        var originalBody = context.Response.Body;
        await using var buffer = new MemoryStream();
        context.Response.Body = buffer;

        try
        {
            await _next(context);
        }
        finally
        {
            context.Response.Body = originalBody;
        }

        if (context.Response.StatusCode == StatusCodes.Status404NotFound)
        {
            using var missLease = _missLimiter!.AttemptAcquire(ip);

            if (!missLease.IsAcquired)
            {
                await WriteRejectedAsync(context, missLease);
                return;
            }
        }

        buffer.Position = 0;
        context.Response.ContentLength = buffer.Length;
        await buffer.CopyToAsync(originalBody, context.RequestAborted);
    }

    private static string ResolveCodePartition(HttpContext context)
    {
        var raw = context.Request.RouteValues.TryGetValue("code", out var value)
            ? value as string
            : null;

        var normalized = StudentQrCodeGenerator.Normalize(raw);

        return StudentQrCodeGenerator.IsValid(normalized)
            ? normalized!
            : InvalidCodePartition;
    }

    private static async Task WriteRejectedAsync(HttpContext context, RateLimitLease lease)
    {
        var response = context.Response;

        // Nothing has reached the client yet (the body was buffered), so the
        // handler's headers can be discarded safely.
        response.Headers.Clear();
        response.ContentLength = null;
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
            message = RejectionMessage
        });
    }
}
