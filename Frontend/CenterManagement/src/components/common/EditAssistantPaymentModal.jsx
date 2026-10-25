import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Pencil, X } from "@/components/icons";

import { formatCurrency } from "../../utils/formatCurrency";
import { formatMonthYear } from "../../utils/months";

const toDateValue = (value) => {
  if (!value) return "";

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return "";

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");

  return `${parsedDate.getFullYear()}-${month}-${day}`;
};

export default function EditAssistantPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  payment,
  assistantName = "",
  // أقصى مبلغ مسموح به لهذه العملية
  // = المرتب الأساسي - (المدفوع خلال الشهر - مبلغ هذه العملية)
  maxAmount = 0,
  loading = false,
}) {
  // يتم تهيئة النموذج مرة واحدة عند فتح النافذة
  // (المكون يُركَّب من جديد عند تغيير عملية الصرف)
  const [formData, setFormData] = useState(() => ({
    amount: Number(payment?.netSalary || 0),
    paidAt: toDateValue(payment?.paidAt),
    notes: payment?.notes || "",
  }));

  if (!isOpen || !payment) return null;

  const limit = Number(maxAmount || 0);

  const handleSubmit = (e) => {
    e.preventDefault();

    const amount = Number(formData.amount);

    if (!amount || amount <= 0) {
      toast.error("يرجى إدخال مبلغ أكبر من صفر!");
      return;
    }

    if (limit > 0 && amount > limit) {
      toast.error(
        `المبلغ أكبر من المسموح به (${formatCurrency(limit)}) — لا يمكن تجاوز إجمالي المرتب!`,
      );
      return;
    }

    onSubmit({
      paymentId: payment.id,
      amount,
      paidAt: formData.paidAt
        ? new Date(formData.paidAt).toISOString()
        : null,
      notes: formData.notes,
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-card border border-surface-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary-subtle text-primary rounded-lg">
              <Pencil className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-main">
              تعديل عملية صرف المرتب
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-text-muted hover:text-text-main p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Assistant + Month (read only) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-text-main">
                المساعد
              </label>

              <p className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main truncate">
                {assistantName || "-"}
              </p>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-text-main">
                الشهر
              </label>

              <p className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main">
                {formatMonthYear(payment.month, payment.year)}
              </p>
            </div>
          </div>

          {/* Current amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xl bg-surface-muted border border-surface-border">
              <p className="text-[11px] text-text-muted">المبلغ الحالي</p>

              <p className="font-bold text-text-main mt-0.5 text-xs">
                {formatCurrency(payment.netSalary)}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-status-success-bg border border-status-success/20">
              <p className="text-[11px] text-text-muted">
                أقصى مبلغ مسموح
              </p>

              <p className="font-bold text-status-success mt-0.5 text-xs">
                {limit > 0 ? formatCurrency(limit) : "-"}
              </p>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-semibold text-text-main">
              المبلغ بعد التعديل *
            </label>

            <input
              type="number"
              min="0"
              step="0.5"
              max={limit || undefined}
              required
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold text-text-main">
              تاريخ الصرف
            </label>

            <input
              type="date"
              value={formData.paidAt}
              onChange={(e) =>
                setFormData({ ...formData, paidAt: e.target.value })
              }
              className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold text-text-main">
              ملاحظات
            </label>

            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="أي ملاحظات إضافية..."
              className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary h-20 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-1/2 py-2.5 rounded-xl border border-surface-border font-bold text-text-muted hover:bg-surface-muted transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 py-2.5 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>حفظ التعديل</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
