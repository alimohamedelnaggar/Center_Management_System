import { BadgePercent, CalendarCheck2, Wallet } from "@/components/icons";

const money = (v) =>
  `${Number(v ?? 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;

export default function PaymentBreakdownCard({ info, amount }) {
  if (!info) return null;

  const typed = Number(amount) || 0;
  const afterThis = Math.max(0, (info.remainingAmount ?? 0) - typed);

  return (
    <div className="rounded-2xl border border-[#1e3a8a]/15 bg-[#1e3a8a]/[0.03] p-4 space-y-3">
      {info.hasDiscount && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
          <BadgePercent className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-xs font-bold text-emerald-800">
            هذا الطالب لديه خصم
            <span className="mx-1 text-emerald-600">
              ({money(info.discountAmount)})
            </span>
          </p>
        </div>
      )}

      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500 font-semibold">
          سعر المجموعة الأساسي
        </span>
        <span
          className={
            info.hasDiscount
              ? "text-gray-400 line-through font-bold"
              : "text-gray-700 font-bold"
          }
        >
          {money(info.groupMonthlyPrice)}
        </span>
      </div>

      {info.hasDiscount && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 font-semibold">
            سعر الطالب بعد الخصم
          </span>
          <span className="text-emerald-700 font-bold">
            {money(info.monthlyPrice)}
          </span>
        </div>
      )}

      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500 font-semibold flex items-center gap-1.5">
          <CalendarCheck2 className="w-3.5 h-3.5" />
          الحصص التي حضرها هذا الشهر
        </span>
        <span className="text-[#1e3a8a] font-bold">
          {info.attendedSessions} من {info.sessionsPerMonth}
        </span>
      </div>

      {/* الحسبة كنص */}
      <div className="rounded-xl bg-white border border-gray-200 px-3 py-2.5 flex items-center justify-between gap-3">
        <p className="text-[11px] text-gray-600 font-semibold leading-relaxed">
          {info.calculationText}
        </p>
        <span className="text-sm font-extrabold text-[#1e3a8a] whitespace-nowrap">
          {money(info.totalAmount)}
        </span>
      </div>

      {info.previouslyPaid > 0 && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 font-semibold">
            مدفوع سابقاً لهذا الشهر
          </span>
          <span className="text-gray-700 font-bold">
            {money(info.previouslyPaid)}
          </span>
        </div>
      )}

      <div className="flex justify-between items-center text-xs border-t border-gray-200 pt-2.5">
        <span className="text-gray-500 font-semibold flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          المتبقي
        </span>
        <span
          className={`font-extrabold ${
            info.remainingAmount > 0 ? "text-amber-600" : "text-emerald-600"
          }`}
        >
          {money(info.remainingAmount)}
        </span>
      </div>

      {typed > 0 && (
        <div
          className={`rounded-xl px-3 py-2 text-[11px] font-bold ${
            afterThis === 0
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-amber-50 text-amber-800 border border-amber-200"
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
