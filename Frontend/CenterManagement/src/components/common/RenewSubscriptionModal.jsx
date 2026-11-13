import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CalendarClock } from "@/components/icons";

import AdminModal from "../ui/AdminModal";
import Button from "../ui/Button";
import { fieldBaseClass } from "../ui/Input";
import { RENEWABLE_PLAN_TYPES } from "../../constants/planTypes";
import { subscriptionService } from "../../services/subscriptionService";

const planTypes = RENEWABLE_PLAN_TYPES;

const inputClass = fieldBaseClass;
const labelClass = "mb-1.5 block text-sm font-medium text-text-main";

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
    <AdminModal
      open={isOpen}
      onClose={onClose}
      busy={saving}
      title={`تجديد الاشتراك — ${center.name}`}
      icon={CalendarClock}
      testId="renew-subscription-modal"
      formProps={{ onSubmit: handleSubmit }}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button type="submit" loading={saving}>
            {saving ? "جارٍ التجديد..." : "تجديد"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {inGraceOrLapsed && (
          <p className="rounded-control border border-status-warning/30 bg-status-warning-bg p-3 text-sm text-status-warning">
            هذا المركز في فترة سماح/منتهٍ. سيبدأ التجديد من تاريخ الانتهاء الأصلي
            حتى لا يفقد الأيام المتبقية.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        </div>
      </div>
    </AdminModal>
  );
}
