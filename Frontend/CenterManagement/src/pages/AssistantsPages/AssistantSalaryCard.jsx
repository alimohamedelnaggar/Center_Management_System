import {
  CalendarDays,
  CircleCheck,
  Clock,
  FileText,
  Phone,
  UserRound,
  Wallet,
} from "@/components/icons";

import { formatCurrency } from "../../utils/formatCurrency";
import { formatMonthYear, formatShortDate } from "../../utils/months";
import {
  SALARY_STATUS,
  getSalaryStatus,
} from "../../utils/assistants/salaryStatus";

const STATUS_STYLES = {
  [SALARY_STATUS.PAID]: {
    badge: "bg-status-success-bg text-status-success border-status-success/20",
    bar: "bg-status-success",
    Icon: CircleCheck,
  },
  [SALARY_STATUS.PARTIAL]: {
    badge: "bg-status-warning-bg text-status-warning border-status-warning/20",
    bar: "bg-status-warning",
    Icon: Clock,
  },
  [SALARY_STATUS.UNPAID]: {
    badge: "bg-status-danger-bg text-status-danger border-status-danger/20",
    bar: "bg-status-danger",
    Icon: Wallet,
  },
};

const ROW_CLASS = "flex items-center justify-between gap-2 text-xs";

export default function AssistantSalaryCard({ item, onPay, onOpenLog }) {
  const salary = Number(item.salary || 0);
  const paid = Number(item.paid || 0);
  const remaining = Math.max(0, Number(item.remaining || 0));

  const statusKey =
    item.status in STATUS_STYLES ? item.status : SALARY_STATUS.UNPAID;

  const style = STATUS_STYLES[statusKey];
  const StatusIcon = style.Icon;

  const isFullyPaid = statusKey === SALARY_STATUS.PAID;
  const percent = salary > 0 ? Math.min(100, (paid / salary) * 100) : 0;
  const lastPayment = formatShortDate(item.lastPaymentDate);

  return (
    <article className="flex flex-col rounded-2xl border border-surface-border bg-surface-card shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-surface-border p-4">
        <div className="p-2.5 rounded-xl bg-primary-subtle text-primary shrink-0">
          <UserRound className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-bold text-text-main truncate">
            {item.fullName}
          </h3>

          <p className="text-xs text-text-muted dir-ltr text-right truncate flex items-center gap-1">
            <Phone className="w-3 h-3" />

            {item.phoneNumber || "-"}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-surface-muted border border-surface-border">
            <p className="text-[11px] text-text-muted">المرتب الأساسي</p>

            <p className="text-sm font-bold text-text-main mt-0.5">
              {formatCurrency(salary)}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-muted border border-surface-border">
            <p className="text-[11px] text-text-muted">المتبقي</p>

            <p
              className={`text-sm font-bold mt-0.5 ${
                remaining > 0 ? "text-status-danger" : "text-status-success"
              }`}
            >
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {/* Paid progress */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
            <span>المدفوع</span>

            <span className="font-bold text-text-main">
              {formatCurrency(paid)}
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${style.bar}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className={ROW_CLASS}>
            <span className="text-text-muted flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
              الشهر
            </span>

            <span className="font-bold text-text-main">
              {formatMonthYear(item.month, item.year)}
            </span>
          </div>

          <div className={ROW_CLASS}>
            <span className="text-text-muted">آخر عملية صرف</span>

            <span className="font-bold text-text-main">
              {lastPayment || "لا يوجد"}
            </span>
          </div>

          <div className={ROW_CLASS}>
            <span className="text-text-muted">عدد عمليات الصرف</span>

            <span className="font-bold text-text-main">
              {item.paymentsCount || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-surface-border p-3">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold ${style.badge}`}
        >
          <StatusIcon className="w-3.5 h-3.5" />

          {getSalaryStatus(statusKey).label}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="السجل"
            onClick={() => onOpenLog(item)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-surface-border text-xs font-bold text-text-muted hover:bg-surface-muted hover:text-primary transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />

            السجل
          </button>

          {isFullyPaid ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-muted text-xs font-bold text-text-muted cursor-not-allowed">
              <CircleCheck className="w-3.5 h-3.5" />

              تم الصرف بالكامل
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onPay(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-status-success text-white text-xs font-bold hover:opacity-90 transition-all shadow-sm"
            >
              {statusKey === SALARY_STATUS.PARTIAL
                ? `صرف ${formatCurrency(remaining, false)} ج.م`
                : "صرف المرتب"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
