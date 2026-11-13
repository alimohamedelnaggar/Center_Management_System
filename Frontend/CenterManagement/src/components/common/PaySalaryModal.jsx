import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { DollarSign } from "@/components/icons";

import AdminModal from "../ui/AdminModal";
import Button from "../ui/Button";
import { fieldBaseClass } from "../ui/Input";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatMonthYear } from "../../utils/months";

const todayValue = () => new Date().toISOString().split("T")[0];
const inputClass = fieldBaseClass;
const labelClass = "mb-1.5 block text-sm font-semibold text-text-main";

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
    <AdminModal
      open={isOpen}
      onClose={onClose}
      busy={loading}
      title="صرف مرتب"
      subtitle={assistant?.fullName ? `${assistant.fullName} — ${formatMonthYear(month, year)}` : undefined}
      icon={DollarSign}
      size="max-w-md"
      testId="pay-salary-modal"
      formProps={{ onSubmit: handleSubmit }}
      footer={
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            loading={loading}
            className="flex-1 bg-status-success hover:bg-status-success/90"
          >
            تأكيد الصرف
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>المساعد</label>
            <p className="min-h-11 w-full truncate rounded-control border border-surface-border bg-surface-muted px-3 py-2.5 text-text-main">
              {assistant?.fullName || "-"}
            </p>
          </div>
          <div>
            <label className={labelClass}>الشهر</label>
            <p className="min-h-11 w-full rounded-control border border-surface-border bg-surface-muted px-3 py-2.5 text-text-main">
              {formatMonthYear(month, year)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-control border border-surface-border bg-surface-muted p-2.5">
            <p className="text-xs text-text-muted">المرتب الأساسي</p>
            <p className="mt-0.5 text-sm font-bold text-text-main">
              {formatCurrency(salary)}
            </p>
          </div>
          <div className="rounded-control border border-status-success/20 bg-status-success-bg p-2.5">
            <p className="text-xs text-text-muted">المدفوع سابقًا</p>
            <p className="mt-0.5 text-sm font-bold text-status-success">
              {formatCurrency(paid)}
            </p>
          </div>
          <div className="rounded-control border border-status-danger/20 bg-status-danger-bg p-2.5">
            <p className="text-xs text-text-muted">المتبقي</p>
            <p className="mt-0.5 text-sm font-bold text-status-danger">
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        <div>
          <label className={labelClass}>المبلغ المراد صرفه *</label>
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
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>تاريخ الصرف</label>
          <input
            type="date"
            dir="ltr"
            value={formData.paidAt}
            onChange={(e) =>
              setFormData({ ...formData, paidAt: e.target.value })
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>ملاحظات</label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            placeholder="أي ملاحظات إضافية..."
            className={inputClass}
          />
        </div>
      </div>
    </AdminModal>
  );
}
