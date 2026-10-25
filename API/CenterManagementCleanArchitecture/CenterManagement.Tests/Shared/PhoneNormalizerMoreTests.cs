using CenterManagement.Core.Features.Shared.Phone;
using Xunit;

namespace CenterManagement.Tests.Shared;

public class PhoneNormalizerMoreTests
{
    [Theory]
    [InlineData("010 123 456 78", "01012345678")]
    [InlineData("010-123-456-78", "01012345678")]
    [InlineData("+201012345678", "01012345678")]
    [InlineData("00201012345678", "01012345678")]
    [InlineData("201012345678", "01012345678")]
    public void Normalizes_Various_Formats(string input, string expected)
    {
        var ok = PhoneNormalizer.TryNormalize(input, out var canonical, out var error);
        Assert.True(ok);
        Assert.Null(error);
        Assert.Equal(expected, canonical);
    }

    [Fact]
    public void Arabic_Indic_Converted()
    {
        var input = "٠١٠١٢٣٤٥٦٧٨";
        var ok = PhoneNormalizer.TryNormalize(input, out var canonical, out var error);
        Assert.True(ok);
        Assert.Equal("01012345678", canonical);
    }

    [Fact]
    public void International_NonEgyptian_Kept_As_Is()
    {
        var ok = PhoneNormalizer.TryNormalize("+12345678", out var canonical, out var error);
        Assert.True(ok);
        Assert.Equal("+12345678", canonical);
    }
}
