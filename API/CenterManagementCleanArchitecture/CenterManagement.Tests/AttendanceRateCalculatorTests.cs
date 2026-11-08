using CenterManagement.Data.Results;

namespace CenterManagement.Tests;

/// <summary>
/// The single attendance-rate formula: (Present + Late) / (Total - Excused).
/// Excused sessions are outside the denominator and a range with nothing
/// countable has no rate at all (null, rendered as "—" by the client).
/// </summary>
public sealed class AttendanceRateCalculatorTests
{
    [Fact]
    public void All_Present_Is_One_Hundred()
    {
        var rate = AttendanceRateCalculator.Calculate(
            present: 5,
            late: 0,
            excused: 0,
            total: 5);

        Assert.Equal(100, rate);
    }

    [Fact]
    public void All_Excused_Has_No_Rate()
    {
        var rate = AttendanceRateCalculator.Calculate(
            present: 0,
            late: 0,
            excused: 4,
            total: 4);

        Assert.Null(rate);
    }

    [Fact]
    public void Empty_Range_Has_No_Rate()
    {
        var rate = AttendanceRateCalculator.Calculate(
            present: 0,
            late: 0,
            excused: 0,
            total: 0);

        Assert.Null(rate);
    }

    [Fact]
    public void Mixed_Statuses_Exclude_Excused_And_Count_Late()
    {
        // Present 2, Late 1, Absent 1, Excused 1 -> (2 + 1) / (5 - 1) = 75%.
        var rate = AttendanceRateCalculator.Calculate(
            present: 2,
            late: 1,
            excused: 1,
            total: 5);

        Assert.Equal(75, rate);
    }

    [Fact]
    public void Late_Counts_As_Present()
    {
        // Present 0, Late 2, Absent 2 -> 2 / 4 = 50%.
        var rate = AttendanceRateCalculator.Calculate(
            present: 0,
            late: 2,
            excused: 0,
            total: 4);

        Assert.Equal(50, rate);
    }

    [Fact]
    public void Excused_Is_Outside_The_Denominator()
    {
        // Present 1, Excused 9 -> 1 / (10 - 9) = 100%.
        var rate = AttendanceRateCalculator.Calculate(
            present: 1,
            late: 0,
            excused: 9,
            total: 10);

        Assert.Equal(100, rate);
    }

    [Fact]
    public void Rate_Is_Rounded_To_Two_Decimals_By_Default()
    {
        var rate = AttendanceRateCalculator.Calculate(
            present: 1,
            late: 0,
            excused: 0,
            total: 3);

        Assert.Equal(33.33, rate);
    }

    [Fact]
    public void Decimals_Can_Be_Requested_By_The_Caller()
    {
        var rate = AttendanceRateCalculator.Calculate(
            present: 2,
            late: 0,
            excused: 0,
            total: 3,
            decimals: 1);

        Assert.Equal(66.7, rate);
    }
}
