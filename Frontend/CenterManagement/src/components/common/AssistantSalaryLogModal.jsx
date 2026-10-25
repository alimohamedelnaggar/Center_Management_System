import { FileText, Pencil, Trash2, Wallet, X } from "@/components/icons";

import { formatMonthYear, formatShortDate } from "../../utils/months";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  SALARY_STATUS,
  SALARY_STATUS_LABELS,
} from "../../utils/assistants/salaryStatus";

const STATUS_STYLES = {
  [SALARY_STATUS.PAID]:
    "bg-status-success-bg text-status-success border-status-success/20",
  [SALARY_STATUS.PARTIAL]:
    "bg-status-warning-bg text-status-warning border-status-warning/20",
  [SALARY_STATUS.UNPAID]:
    "bg-status-danger-bg text-status-danger border-status-danger/20",
};

// تجميع الشهور حسب السنة للعرض فقط
// (الإجماليات تأتي محسوبة من الخادم)
const groupByYear = (months) =>
  months.reduce((acc, month) => {
    const current = acc.find((item) => item.year === month.year);

    if (current) {
      current.months.push(month);
    } else {
      acc.push({ year: month.year, months: [month] });
    }

    return acc;
  }, []);

export default function AssistantSalaryLogModal({
  isOpen,
  onClose,
  assistant,
  data,
  loading = false,
  onEditPayment = null,
  onDeletePayment = null,
}) {
  if (!isOpen) return null;

  const years = groupByYear(data?.months || []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pb-24 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[calc(100vh-120px)] flex flex-col overflow-hidden bg-surface-card rounded-2xl shadow-2xl border border-surface-border">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-surface-border shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary-subtle text-primary shrink-0">
              <FileText className="w-5 h-5" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold">سجل مرتبات المساعد</h2>

              <p className="text-sm text-text-muted mt-1">
                {data?.fullName || assistant?.fullName || "-"}

                {data?.phoneNumber || assistant?.phoneNumber ? (
                  <span className="dir-ltr inline-block ms-2">
                    {data?.phoneNumber || assistant?.phoneNumber}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:bg-surface-muted hover:text-text-main transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 pb-8 overscroll-contain">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-text-muted font-bold">
                جاري تحميل تفاصيل المرتبات...
              </div>
            </div>
          ) : (
            <>
              {/* Assistant summary */}
              <div className="mb-5 p-4 rounded-2xl bg-primary-subtle border border-primary/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Wallet className="w-5 h-5" />
                  </div>

                  <div>
                    <p className="text-xs text-text-muted">
                      إجمالي المرتبات المصروفة (كل الأشهر)
                    </p>

                    <p className="text-xl font-extrabold mt-0.5">
                      {formatCurrency(data?.totalPaid || 0)}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-text-muted text-left">
                  <p>
                    المرتب الحالي:{" "}
                    <span className="font-bold text-text-main">
                      {formatCurrency(data?.salary || 0)}
                    </span>
                  </p>

                  <p className="mt-1">
                    عدد الشهور:{" "}
                    <span className="font-bold text-text-main">
                      {data?.months?.length || 0}
                    </span>
                  </p>
                </div>
              </div>

              {/* History by year */}
              {years.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-surface-border text-text-muted">
                  لا توجد عمليات صرف مرتبات لهذا المساعد.
                </div>
              ) : (
                <div className="space-y-6">
                  {years.map((group) => (
                    <section key={group.year}>
                      <h3 className="flex items-center gap-2 text-sm font-extrabold text-text-muted mb-3">
                        <span className="px-2.5 py-1 rounded-lg bg-surface-muted">
                          {group.year}
                        </span>
                      </h3>

                      <div className="space-y-3">
                        {group.months.map((month) => {
                          const statusKey = SALARY_STATUS_LABELS[month.status]
                            ? month.status
                            : SALARY_STATUS.UNPAID;

                          const isUnpaid =
                            statusKey === SALARY_STATUS.UNPAID;

                          return (
                            <article
                              key={`${month.year}-${month.month}`}
                              className="rounded-2xl border border-surface-border overflow-hidden"
                            >
                              {/* Month header */}
                              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-muted">
                                <h4 className="font-extrabold text-sm">
                                  {formatMonthYear(month.month, month.year)}
                                </h4>

                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-bold ${STATUS_STYLES[statusKey]}`}
                                >
                                  {isUnpaid
                                    ? "لم يتم الصرف"
                                    : SALARY_STATUS_LABELS[statusKey]}
                                </span>
                              </div>

                              {/* Month totals */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3">
                                <div className="p-2 rounded-xl bg-surface-muted">
                                  <p className="text-[11px] text-text-muted">
                                    المرتب
                                  </p>

                                  <p className="text-xs font-bold text-text-main mt-0.5">
                                    {formatCurrency(month.basicSalary)}
                                  </p>
                                </div>

                                <div className="p-2 rounded-xl bg-status-success-bg">
                                  <p className="text-[11px] text-text-muted">
                                    المدفوع
                                  </p>

                                  <p className="text-xs font-bold text-status-success mt-0.5">
                                    {formatCurrency(month.totalPaid)}
                                  </p>
                                </div>

                                <div className="p-2 rounded-xl bg-status-danger-bg">
                                  <p className="text-[11px] text-text-muted">
                                    المتبقي
                                  </p>

                                  <p
                                    className={`text-xs font-bold mt-0.5 ${
                                      month.remaining > 0
                                        ? "text-status-danger"
                                        : "text-status-success"
                                    }`}
                                  >
                                    {formatCurrency(month.remaining)}
                                  </p>
                                </div>

                                <div className="p-2 rounded-xl bg-surface-muted">
                                  <p className="text-[11px] text-text-muted">
                                    عدد العمليات
                                  </p>

                                  <p className="text-xs font-bold text-text-main mt-0.5">
                                    {month.paymentsCount || 0}
                                  </p>
                                </div>
                              </div>

                              {/* Operations */}
                              {month.operations?.length > 0 ? (
                                <ul className="divide-y divide-surface-border border-t border-surface-border">
                                  {month.operations.map((operation, index) => (
                                    <li
                                      key={operation.id}
                                      className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-[11px] font-bold text-text-muted w-4">
                                          {index + 1}.
                                        </span>

                                        <span className="text-xs font-bold text-text-muted dir-ltr">
                                          {formatShortDate(operation.paidAt) ||
                                            "-"}
                                        </span>

                                        <span className="text-sm font-extrabold text-text-main">
                                          {formatCurrency(operation.netSalary)}
                                        </span>

                                        <span className="text-[11px] text-text-muted">
                                          المستلم:{" "}
                                          <span className="font-bold text-text-main">
                                            {operation.receivedByName || "-"}
                                          </span>
                                        </span>

                                        {operation.notes && (
                                          <span className="text-[11px] text-text-muted truncate max-w-40">
                                            {operation.notes}
                                          </span>
                                        )}
                                      </div>

                                      {(onEditPayment ||
                                        onDeletePayment) && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {onEditPayment && (
                                            <button
                                              type="button"
                                              title="تعديل"
                                              onClick={() =>
                                                onEditPayment(operation, month)
                                              }
                                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-surface-border text-[11px] font-bold text-text-muted hover:bg-surface-muted hover:text-primary transition-colors"
                                            >
                                              <Pencil className="w-3.5 h-3.5" />

                                              تعديل
                                            </button>
                                          )}

                                          {onDeletePayment && (
                                            <button
                                              type="button"
                                              title="حذف"
                                              onClick={() =>
                                                onDeletePayment(operation)
                                              }
                                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-surface-border text-[11px] font-bold text-text-muted hover:bg-status-danger-bg hover:text-status-danger transition-colors"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />

                                              حذف
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="p-3 text-xs text-status-danger border-t border-surface-border">
                                  لم يتم الصرف
                                </p>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
