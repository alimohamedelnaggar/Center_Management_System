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
    <article className="flex flex-col rounded-card border border-surface-border bg-surface-card shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-surface-border p-4">
        <div className="shrink-0 rounded-control bg-primary-subtle p-2.5 text-primary">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-text-main">
            {item.fullName}
          </h3>

          <p className="flex items-center gap-1 truncate text-xs text-text-muted" dir="ltr">
            <Phone className="h-3 w-3" aria-hidden="true" />

            {item.phoneNumber || "-"}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-control border border-surface-border bg-surface-muted p-2.5">
            <p className="text-xs text-text-muted">المرتب الأساسي</p>

            <p className="mt-0.5 text-sm font-bold text-text-main">
              {formatCurrency(salary)}
            </p>
          </div>

          <div className="rounded-control border border-surface-border bg-surface-muted p-2.5">
            <p className="text-xs text-text-muted">المتبقي</p>

            <p
              className={`mt-0.5 text-sm font-bold ${
                remaining > 0 ? "text-status-danger" : "text-status-success"
              }`}
            >
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {/* Paid progress */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
            <span>المدفوع</span>

            <span className="font-bold text-text-main">
              {formatCurrency(paid)}
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className={`h-full rounded-full transition-all ${style.bar}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className={ROW_CLASS}>
            <span className="flex items-center gap-1 text-text-muted">
              <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
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
      <div className="space-y-2 border-t border-surface-border p-3">
        <span
          className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-bold ${style.badge}`}
        >
          <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />

          {getSalaryStatus(statusKey).label}
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            title="السجل"
            onClick={() => onOpenLog(item)}
            className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-control border border-surface-border px-2.5 text-xs font-bold text-text-muted transition-colors hover:bg-surface-muted hover:text-primary"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />

            السجل
          </button>

          {isFullyPaid ? (
            <span className="inline-flex min-h-11 flex-1 cursor-not-allowed items-center justify-center gap-1 rounded-control bg-surface-muted px-2.5 text-xs font-bold text-text-muted">
              <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />

              تم الصرف بالكامل
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onPay(item)}
              className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-control bg-status-success px-2.5 text-xs font-bold text-text-inverse shadow-sm transition-all hover:opacity-90"
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
