import { Calendar, X } from "@/components/icons";

export default function ViewExpenseModal({
  open,
  onClose,
  expense,
}) {
  if (!open || !expense) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-surface-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="text-lg font-bold text-text-main">
            تفاصيل المصروف
          </h2>

          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-5">
          <Info label="اسم المصروف" value={expense.name} />

          <Info label="الفئة" value={expense.categoryName} />

          <Info
            label="المبلغ"
            value={`${expense.amount.toFixed(2)} جنيه`}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">
              التاريخ
            </label>

            <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-muted px-3 py-2.5">
              <Calendar className="h-4 w-4 text-text-muted" />
              <span className="text-sm text-text-main">
                {expense.expenseDate}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-muted">
              الملاحظات
            </label>

            <div className="min-h-24 rounded-lg border border-surface-border bg-surface-muted px-3 py-2.5 text-sm text-text-main">
              {expense.notes || "لا توجد ملاحظات"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-surface-border px-5 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-text-inverse hover:bg-primary-hover"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-text-muted">
        {label}
      </label>

      <div className="rounded-lg border border-surface-border bg-surface-muted px-3 py-2.5 text-sm text-text-main">
        {value}
      </div>
    </div>
  );
}