import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { DollarSign, X, Loader2 } from "@/components/icons";

import { formatCurrency } from "../../utils/formatCurrency";
import { formatMonthYear } from "../../utils/months";

const todayValue = () => new Date().toISOString().split("T")[0];

export default function PaySalaryModal({
  isOpen,
  onClose,
  onSubmit,
  assistant,
  month,
  year,
  salary = 0,
  paid = 0,
  remaining = 0,
  loading = false,
}) {
  const [formData, setFormData] = useState({
    amount: 0,
    paidAt: todayValue(),
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      (() => {
        setFormData({
          amount: Number(remaining) || 0,
          paidAt: todayValue(),
          notes: "",
        });
      })();
    }
  }, [isOpen, remaining]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const amount = Number(formData.amount);

    if (!amount || amount <= 0) {
      toast.error("يرجى إدخال المبلغ المراد صرفه!");
      return;
    }

    if (amount > Number(remaining)) {
      toast.error("المبلغ أكبر من المتبقي من المرتب!");
      return;
    }

    onSubmit({
      assistantId: assistant?.id,
      assistantName: assistant?.fullName,
      month: Number(month),
      year: Number(year),
      amount,
      paidAt: formData.paidAt ? new Date(formData.paidAt).toISOString() : null,
      notes: formData.notes,
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-card border border-surface-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-status-success-bg text-status-success rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-main">صرف مرتب</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-text-muted hover:text-text-main p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Assistant + Month */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-text-main">
                المساعد
              </label>

              <p className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main truncate">
                {assistant?.fullName || "-"}
              </p>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-text-main">
                الشهر
              </label>

              <p className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main">
                {formatMonthYear(month, year)}
              </p>
            </div>
          </div>

          {/* Salary summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-surface-muted border border-surface-border">
              <p className="text-[11px] text-text-muted">المرتب الأساسي</p>

              <p className="font-bold text-text-main mt-0.5 text-xs">
                {formatCurrency(salary)}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-status-success-bg border border-status-success/20">
              <p className="text-[11px] text-text-muted">المدفوع سابقًا</p>

              <p className="font-bold text-status-success mt-0.5 text-xs">
                {formatCurrency(paid)}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-status-danger-bg border border-status-danger/20">
              <p className="text-[11px] text-text-muted">المتبقي</p>

              <p className="font-bold text-status-danger mt-0.5 text-xs">
                {formatCurrency(remaining)}
              </p>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-semibold text-text-main">
              المبلغ المراد صرفه *
            </label>

            <input
              type="number"
              min="0"
              step="0.5"
              max={Number(remaining) || 0}
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
              className="w-1/2 py-2.5 rounded-xl bg-status-success text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>تأكيد الصرف</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
