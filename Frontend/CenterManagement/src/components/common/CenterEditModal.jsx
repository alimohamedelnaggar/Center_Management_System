import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { X } from "@/components/icons";

const emptyForm = {
  name: "",
  phone: "",
  address: "",
  description: "",
  notes: "",
  type: "MultiTeacher",
  plan: "",
  subscriptionStart: "",
  subscriptionEnd: "",
};

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const inputClass =
  "w-full rounded-xl border border-surface-border bg-surface-muted p-2.5 text-text-main focus:border-primary focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-text-main";

export default function CenterEditModal({ isOpen, center, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isOpen && center) {
      setForm({
        name: center.name ?? "",
        phone: center.phone ?? "",
        address: center.address ?? "",
        description: center.description ?? "",
        notes: center.notes ?? "",
        type: center.type ?? "MultiTeacher",
        plan: center.plan ?? "",
        subscriptionStart: toDateInput(center.subscriptionStart),
        subscriptionEnd: toDateInput(center.subscriptionEnd),
      });
    }
  }, [isOpen, center]);

  if (!isOpen || !center) return null;

  const setField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("اسم المركز مطلوب");
      return;
    }

    if (
      form.subscriptionStart &&
      form.subscriptionEnd &&
      form.subscriptionEnd < form.subscriptionStart
    ) {
      toast.error("تاريخ نهاية الاشتراك يجب أن يكون بعد تاريخ البداية");
      return;
    }

    await onSubmit({
      id: center.id,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
      type: form.type === "SoloTeacher" ? 2 : 1,
      plan: form.plan.trim() || null,
      subscriptionStart: form.subscriptionStart
        ? new Date(form.subscriptionStart).toISOString()
        : null,
      subscriptionEnd: form.subscriptionEnd
        ? new Date(form.subscriptionEnd).toISOString()
        : null,
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-text-main">
            تعديل المركز والاشتراك
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:bg-surface-muted"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>اسم المركز</label>
            <input className={inputClass} value={form.name} onChange={setField("name")} />
          </div>

          <div>
            <label className={labelClass}>الهاتف</label>
            <input dir="ltr" className={inputClass} value={form.phone} onChange={setField("phone")} />
          </div>

          <div>
            <label className={labelClass}>النوع</label>
            <select className={inputClass} value={form.type} onChange={setField("type")}>
              <option value="MultiTeacher">مركز (متعدد المدرسين)</option>
              <option value="SoloTeacher">مدرس فردي</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>العنوان</label>
            <input className={inputClass} value={form.address} onChange={setField("address")} />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>الوصف</label>
            <input className={inputClass} value={form.description} onChange={setField("description")} />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>ملاحظات داخلية</label>
            <input className={inputClass} value={form.notes} onChange={setField("notes")} />
          </div>

          <div>
            <label className={labelClass}>الخطة</label>
            <input className={inputClass} value={form.plan} onChange={setField("plan")} />
          </div>

          <div />

          <div>
            <label className={labelClass}>بداية الاشتراك</label>
            <input
              type="date"
              dir="ltr"
              className={inputClass}
              value={form.subscriptionStart}
              onChange={setField("subscriptionStart")}
            />
          </div>

          <div>
            <label className={labelClass}>نهاية الاشتراك</label>
            <input
              type="date"
              dir="ltr"
              className={inputClass}
              value={form.subscriptionEnd}
              onChange={setField("subscriptionEnd")}
            />
          </div>

          <div className="flex justify-end gap-3 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-surface-border px-4 py-2 text-text-muted hover:bg-surface-muted"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2 font-bold text-white hover:bg-primary-hover"
            >
              حفظ التغييرات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
