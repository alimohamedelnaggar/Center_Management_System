using CenterManagement.Core;
using CenterManagement.Core.Features.Shared.EmailFeature.Senders;
using CenterManagement.Data.Helpers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace CenterManagement.Tests;

/// <summary>
/// Guards the outgoing-mail selection: the fake sender is the default, the real
/// SMTP sender only starts when Email:UseRealSender=true, and Testing/E2E can
/// never reach a real mailbox no matter what configuration says.
/// </summary>
public sealed class EmailSenderSelectionTests
{
    [Fact]
    public void Fake_sender_is_the_default_when_the_flag_is_absent()
    {
        Assert.IsType<FakeEmailSender>(Resolve("Development", useRealSender: null));
    }

    [Fact]
    public void Fake_sender_is_used_when_the_flag_is_false()
    {
        Assert.IsType<FakeEmailSender>(Resolve("Development", useRealSender: false));
    }

    [Fact]
    public void Real_smtp_sender_runs_outside_tests_when_the_flag_is_true()
    {
        Assert.IsType<SmtpEmailSender>(Resolve("Development", useRealSender: true));
        Assert.IsType<SmtpEmailSender>(Resolve("Production", useRealSender: true));
    }

    [Theory]
    [InlineData("Testing")]
    [InlineData("E2E")]
    public void Real_smtp_sender_can_never_run_in_protected_environments(string environmentName)
    {
        Assert.IsType<FakeEmailSender>(Resolve(environmentName, useRealSender: true));
    }

    private static IEmailSender Resolve(string environmentName, bool? useRealSender)
    {
        var values = new Dictionary<string, string?>();
        if (useRealSender.HasValue)
            values["Email:UseRealSender"] = useRealSender.Value.ToString();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddSingleton<IHostEnvironment>(new TestHostEnvironment(environmentName));
        services.AddSingleton(new EmailSettings
        {
            Host = "smtp.example.test",
            Port = 587,
            FromEmail = "sender@example.test",
            Password = "not-a-real-password"
        });

        services.AddCoreDependencies();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();

        return scope.ServiceProvider.GetRequiredService<IEmailSender>();
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public TestHostEnvironment(string environmentName)
        {
            EnvironmentName = environmentName;
        }

        public string EnvironmentName { get; set; }
        public string ApplicationName { get; set; } = "CenterManagement.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
