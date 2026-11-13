import { BadgePercent, CalendarCheck2, Wallet } from "@/components/icons";

const money = (v) =>
  `${Number(v ?? 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;

const ROW = "flex items-center justify-between gap-3 text-sm";

/**
 * Read-only breakdown of the amount being collected (price, discount,
 * attended sessions, previous payments and what would remain). The numbers
 * themselves are produced by the API and are only formatted here.
 */
export default function PaymentBreakdownCard({ info, amount }) {
  if (!info) return null;

  const typed = Number(amount) || 0;
  const afterThis = Math.max(0, (info.remainingAmount ?? 0) - typed);

  return (
    <div className="space-y-3 rounded-card border border-primary/20 bg-primary-subtle/40 p-4">
      {info.hasDiscount && (
        <div className="flex items-start gap-2 rounded-control border border-status-success/30 bg-status-success-bg px-3 py-2">
          <BadgePercent className="mt-0.5 h-4 w-4 shrink-0 text-status-success" />

          <p className="text-sm font-bold text-status-success">
            هذا الطالب لديه خصم
            <span className="num mx-1">
              ({money(info.discountAmount)})
            </span>
          </p>
        </div>
      )}

      <div className={ROW}>
        <span className="font-semibold text-text-muted">
          سعر المجموعة الأساسي
        </span>

        <span
          className={`num font-bold ${
            info.hasDiscount
              ? "text-text-muted line-through"
              : "text-text-main"
          }`}
        >
          {money(info.groupMonthlyPrice)}
        </span>
      </div>

      {info.hasDiscount && (
        <div className={ROW}>
          <span className="font-semibold text-text-muted">
            سعر الطالب بعد الخصم
          </span>

          <span className="num font-bold text-status-success">
            {money(info.monthlyPrice)}
          </span>
        </div>
      )}

      <div className={ROW}>
        <span className="flex items-center gap-1.5 font-semibold text-text-muted">
          <CalendarCheck2 className="h-4 w-4" />
          الحصص التي حضرها هذا الشهر
        </span>

        <span className="num font-bold text-primary">
          {info.attendedSessions} من {info.sessionsPerMonth}
        </span>
      </div>

      {/* الحسبة كنص */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-surface-border bg-surface-card px-3 py-2.5">
        <p className="text-sm font-semibold leading-relaxed text-text-main">
          {info.calculationText}
        </p>

        <span className="num whitespace-nowrap text-base font-extrabold text-primary">
          {money(info.totalAmount)}
        </span>
      </div>

      {info.previouslyPaid > 0 && (
        <div className={ROW}>
          <span className="font-semibold text-text-muted">
            مدفوع سابقاً لهذا الشهر
          </span>

          <span className="num font-bold text-text-main">
            {money(info.previouslyPaid)}
          </span>
        </div>
      )}

      <div className={`${ROW} border-t border-surface-border pt-2.5`}>
        <span className="flex items-center gap-1.5 font-semibold text-text-muted">
          <Wallet className="h-4 w-4" />
          المتبقي
        </span>

        <span
          className={`num font-extrabold ${
            info.remainingAmount > 0
              ? "text-status-warning"
              : "text-status-success"
          }`}
        >
          {money(info.remainingAmount)}
        </span>
      </div>

      {typed > 0 && (
        <div
          className={`rounded-control border px-3 py-2 text-sm font-bold ${
            afterThis === 0
              ? "border-status-success/30 bg-status-success-bg text-status-success"
              : "border-status-warning/30 bg-status-warning-bg text-status-warning"
          }`}
        >
          {afterThis === 0
            ? "بعد هذه الدفعة: الشهر مسدد بالكامل "
            : `بعد هذه الدفعة سيتبقى ${money(afterThis)}`}
        </div>
      )}
    </div>
  );
}
