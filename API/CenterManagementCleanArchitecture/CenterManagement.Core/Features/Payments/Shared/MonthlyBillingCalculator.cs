namespace CenterManagement.Core.Features.Payments.Shared;

public sealed record MonthlyBillingResult
{
    public decimal GroupMonthlyPrice { get; init; }
    public decimal EffectiveMonthlyPrice { get; init; }
    public bool HasDiscount { get; init; }
    public decimal DiscountAmount { get; init; }
    public int SessionsPerMonth { get; init; }
    public decimal PricePerSession { get; init; }
    public int BilledSessions { get; init; }
    public bool IsFullMonth { get; init; }
    public decimal TotalAmount { get; init; }
    public string CalculationText { get; init; } = string.Empty;
}

public static class MonthlyBillingCalculator
{
    public const int DefaultSessionsPerMonth = 8;

    public static MonthlyBillingResult Calculate(
        decimal groupMonthlyPrice,
        decimal? customMonthlyPrice,
        int groupSessionsPerMonth,
        int? sessionsCount)
    {
        var sessionsPerMonth = groupSessionsPerMonth > 0
            ? groupSessionsPerMonth
            : DefaultSessionsPerMonth;

        // السعر الفعلي للطالب = السعر المخصص (بعد الخصم) أو سعر المجموعة
        var effectiveMonthlyPrice = customMonthlyPrice ?? groupMonthlyPrice;

        var hasDiscount = customMonthlyPrice.HasValue
                          && customMonthlyPrice.Value < groupMonthlyPrice;

        var discountAmount = hasDiscount
            ? groupMonthlyPrice - customMonthlyPrice!.Value
            : 0m;

        var pricePerSession = Math.Round(
            effectiveMonthlyPrice / sessionsPerMonth, 2, MidpointRounding.AwayFromZero);

        var billedSessions = sessionsCount.HasValue
            ? Math.Clamp(sessionsCount.Value, 0, sessionsPerMonth)
            : sessionsPerMonth;

        var isFullMonth = !sessionsCount.HasValue || billedSessions >= sessionsPerMonth;

        // الشهر الكامل بياخد السعر زي ما هو (من غير أي تقريب في القسمة)
        var totalAmount = isFullMonth
            ? effectiveMonthlyPrice
            : Math.Round(pricePerSession * billedSessions, 2, MidpointRounding.AwayFromZero);

        var calculationText = isFullMonth
            ? $"اشتراك شهر كامل ({sessionsPerMonth} حصص) = {totalAmount:0.##} ج.م"
            : $"{pricePerSession:0.##} ج.م (سعر الحصة) × {billedSessions} حصص = {totalAmount:0.##} ج.م";

        return new MonthlyBillingResult
        {
            GroupMonthlyPrice = groupMonthlyPrice,
            EffectiveMonthlyPrice = effectiveMonthlyPrice,
            HasDiscount = hasDiscount,
            DiscountAmount = discountAmount,
            SessionsPerMonth = sessionsPerMonth,
            PricePerSession = pricePerSession,
            BilledSessions = billedSessions,
            IsFullMonth = isFullMonth,
            TotalAmount = totalAmount,
            CalculationText = calculationText
        };
    }
}