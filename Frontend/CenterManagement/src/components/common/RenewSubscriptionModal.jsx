import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { X } from "@/components/icons";
import { RENEWABLE_PLAN_TYPES } from "../../constants/planTypes";
import { subscriptionService } from "../../services/subscriptionService";

const planTypes = RENEWABLE_PLAN_TYPES;

const inputClass =
  "w-full rounded-xl border border-surface-border bg-surface-muted p-2.5 text-text-main focus:border-primary focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-text-main";

export default function RenewSubscriptionModal({ isOpen, center, onClose, onRenewed }) {
  const [type, setType] = useState(4);
  const [price, setPrice] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && center) {
      setType(4);
      setPrice(center.price ?? "");
      setPaidAmount(center.price ?? "");
      setCurrency(center.currency || "EGP");
      setNotes("");
    }
  }, [isOpen, center]);

  if (!isOpen || !center) return null;

  const inGraceOrLapsed = center.state === "InGrace" || center.state === "Expired";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await subscriptionService.renew(center.id, {
        type,
        price: Number(price) || 0,
        paidAmount: Number(paidAmount) || 0,
        currency: currency || "EGP",
        notes: notes.trim() || null,
      });

      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذر تجديد الاشتراك");
        return;
      }

      toast.success("تم تجديد الاشتراك بنجاح");
      onRenewed?.();
      onClose?.();
    } catch {
      toast.error("حدث خطأ أثناء التجديد");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-text-main">
            تجديد الاشتراك — {center.name}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:bg-surface-muted"
          >
            <X size={20} />
          </button>
        </div>

        {inGraceOrLapsed && (
          <p className="mb-4 rounded-xl bg-status-warning-bg p-3 text-xs text-status-warning">
            هذا المركز في فترة سماح/منتهٍ. سيبدأ التجديد من تاريخ الانتهاء الأصلي
            حتى لا يفقد الأيام المتبقية.
          </p>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>نوع الاشتراك</label>
            <select
              className={inputClass}
              value={type}
              onChange={(e) => setType(Number(e.target.value))}
            >
              {planTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>العملة</label>
            <input
              dir="ltr"
              className={inputClass}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>السعر</label>
            <input
              type="number"
              dir="ltr"
              min="0"
              className={inputClass}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>المدفوع</label>
            <input
              type="number"
              dir="ltr"
              min="0"
              className={inputClass}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>ملاحظات</label>
            <input
              className={inputClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-surface-border px-4 py-2 text-text-muted hover:bg-surface-muted disabled:opacity-60"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-5 py-2 font-bold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {saving ? "جارٍ التجديد..." : "تجديد"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
