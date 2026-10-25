using System.Globalization;

using CenterManagement.Data.Entities.Groups;

namespace CenterManagement.Core.Features.Payments.Shared;

/// <summary>
/// Single source of truth for "from which billing month does this student owe money?".
///
/// The write side already enforces this rule in
/// <c>AddPaymentCommandHandler</c> / <c>UpdatePaymentHandler</c>, which reject any
/// payment for a month earlier than the month the student joined the group
/// (StudentGroup.JoinDate). The read side (Finance pages) used to ignore it,
/// which made a brand new student look "unpaid" for months before they joined.
///
/// This helper re-uses the exact same field (<see cref="StudentGroup.JoinDate"/>)
/// and the exact same month granularity, so reads and writes can never disagree.
/// </summary>
public static class StudentBillingPeriod
{
    /// <summary>
    /// The system only started recording payments from August 2026.
    /// Matches the hard-coded value in AddPaymentCommandHandler.
    /// </summary>
    public static readonly DateOnly SystemStartBillingPeriod =
        new(2026, 8, 1);

    /// <summary>
    /// Collapses any date to the first day of its month.
    /// This is the granularity used everywhere a billing period is compared,
    /// so a student who joined on 31 October still owes for November.
    /// </summary>
    public static DateOnly ToPeriod(DateTime date) =>
        new(date.Year, date.Month, 1);

    /// <summary>
    /// The billing month a student starts owing from, based on the group they
    /// are currently enrolled in. Returns null when the student is not
    /// currently in any group, so callers can decide how to treat that case.
    /// </summary>
    public static DateOnly? GetStartPeriod(StudentGroup? activeStudentGroup) =>
        activeStudentGroup is null
            ? null
            : ToPeriod(activeStudentGroup.JoinDate);

    /// <summary>
    /// True when <paramref name="billingPeriod"/> is earlier than the month the
    /// student joined, i.e. the student was not subscribed yet and nothing is due.
    ///
    /// A student with no current group membership is never treated as
    /// "not applicable" - their real payments must stay visible.
    /// </summary>
    public static bool IsBeforeStartPeriod(
        DateOnly billingPeriod,
        DateOnly? startPeriod) =>
        startPeriod.HasValue && billingPeriod < startPeriod.Value;

    /// <summary>
    /// Month index used to compare months with plain integer arithmetic.
    /// Safe to translate to SQL (no date construction), unlike new DateOnly(...).
    /// </summary>
    public static int MonthIndex(int year, int month) =>
        (year * 12) + month;

    /// <summary>
    /// SQL-translatable expression body: the month index of the student's
    /// current group JoinDate. Use with <see cref="MonthIndex(int,int)"/>.
    /// </summary>
    public static int JoinMonthIndex(DateTime joinDate) =>
        MonthIndex(joinDate.Year, joinDate.Month);

    /// <summary>
    /// Backend-owned Arabic label, so the business rule and its wording stay on
    /// the server instead of being re-derived in the UI.
    /// </summary>
    public static string BuildNotApplicableLabel(DateOnly? startPeriod)
    {
        if (!startPeriod.HasValue)
            return "لم يكن مشتركًا في هذا الشهر";

        return $"بدأ في {GetArabicMonthName(startPeriod.Value.Month)} {startPeriod.Value.Year}";
    }

    private static string GetArabicMonthName(int month)
    {
        try
        {
            return CultureInfo
                .GetCultureInfo("ar-EG")
                .DateTimeFormat
                .GetMonthName(month);
        }
        catch (Exception)
        {
            // Fallback keeps the response usable if ICU data is unavailable.
            return month.ToString("00", CultureInfo.InvariantCulture);
        }
    }
}
