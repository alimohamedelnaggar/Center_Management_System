using System;

namespace CenterManagement.Data.Results;

/// <summary>
/// The single attendance-rate formula used by every API surface.
///
/// Rate = (Present + Late) / (Total - Excused).
/// Excused sessions are excluded from the denominator, and a range with no
/// countable sessions has no rate at all (null), so the client can show "—"
/// instead of a misleading zero.
/// </summary>
public static class AttendanceRateCalculator
{
    public const int DefaultDecimals = 2;

    public static double? Calculate(
        int present,
        int late,
        int excused,
        int total,
        int decimals = DefaultDecimals)
    {
        var countable = total - excused;

        if (countable <= 0)
            return null;

        return Math.Round((present + late) * 100.0 / countable, decimals);
    }
}
