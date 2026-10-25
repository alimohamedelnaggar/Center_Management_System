using CenterManagement.Core.Features.Shared.Phone;
using Xunit;

namespace CenterManagement.Tests.Shared;

public class PhoneNormalizerTests
{
    [Theory]
    [InlineData("01012345678", "01012345678")]
    [InlineData("01112345678", "01112345678")]
    [InlineData("01212345678", "01212345678")]
    [InlineData("01512345678", "01512345678")]
    public void Normalizes_Egyptian_Local_Formats(string input, string expected)
    {
        var ok = PhoneNormalizer.TryNormalize(input, out var canonical, out var error);
        Assert.True(ok);
        Assert.Null(error);
        Assert.Equal(expected, canonical);
    }

    [Fact]
    public void Strips_Spaces_And_Dashes()
    {
        var ok = PhoneNormalizer.TryNormalize("010 123 456 78", out var canonical, out var error);
        Assert.True(ok);
        Assert.Null(error);
        Assert.Equal("01012345678", canonical);
    }

    [Theory]
    [InlineData("201012345678", "01012345678")]
    [InlineData("+201012345678", "01012345678")]
    [InlineData("00201012345678", "01012345678")]
    public void Normalizes_International_Egyptian(string input, string expected)
    {
        var ok = PhoneNormalizer.TryNormalize(input, out var canonical, out var error);
        Assert.True(ok);
        Assert.Null(error);
        Assert.Equal(expected, canonical);
    }

    [Theory]
    [InlineData("123")]
    [InlineData("0101234567")]
    [InlineData("01312345678")]
    [InlineData("")]
    public void Returns_Error_For_Invalid(string input)
    {
        var ok = PhoneNormalizer.TryNormalize(input, out var canonical, out var error);
        Assert.False(ok);
        Assert.NotNull(error);
        Assert.Null(canonical);
    }

    [Fact]
    public void Returns_Error_For_Null()
    {
        var ok = PhoneNormalizer.TryNormalize(null, out var canonical, out var error);
        Assert.False(ok);
        Assert.NotNull(error);
        Assert.Null(canonical);
    }

    [Fact]
    public void Converts_Arabic_Indic_Digits()
    {
        // Arabic-Indic ٠١٢٣٤٥٦٧٨٩
        var input = "\u0660\u0661\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668";
        var ok = PhoneNormalizer.TryNormalize(input, out var canonical, out var error);
        Assert.True(ok);
        Assert.Equal("01012345678", canonical);
    }

    [Fact]
    public void Non_Egyptian_International_With_Plus_Is_Kept_As_Is()
    {
        var ok = PhoneNormalizer.TryNormalize("+12345678", out var canonical, out var error);
        Assert.True(ok);
        Assert.Null(error);
        Assert.Equal("+12345678", canonical);
    }
}
