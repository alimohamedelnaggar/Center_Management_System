import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Building2 } from "@/components/icons";

import AdminModal from "../ui/AdminModal";
import Button from "../ui/Button";
import { fieldBaseClass } from "../ui/Input";
import {
  STAFF_EMAIL_HELPER_TEXT,
  validateStaffEmail,
} from "../../utils/staffEmail";

const emptyForm = {
  name: "",
  phone: "",
  ownerEmail: "",
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

const inputClass = fieldBaseClass;
const labelClass = "mb-1.5 block text-sm font-medium text-text-main";

export default function CenterEditModal({ isOpen, center, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isOpen && center) {
      setForm({
        name: center.name ?? "",
        phone: center.phone ?? "",
        ownerEmail: center.ownerEmail ?? "",
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

    const email = validateStaffEmail(form.ownerEmail);
    if (!email.valid) {
      toast.error(email.message);
      return;
    }

    if (
      center.ownerEmail &&
      !email.value &&
      !window.confirm(
        "سيتم حذف البريد الإلكتروني لمالك المركز، ولن يستطيع استعادة كلمة المرور بنفسه. هل تريد المتابعة؟",
      )
    ) {
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
      ownerEmail: email.value ?? "",
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
    <AdminModal
      open={isOpen}
      onClose={onClose}
      title="تعديل المركز والاشتراك"
      subtitle={center.name}
      icon={Building2}
      size="max-w-2xl"
      testId="center-edit-modal"
      formProps={{ onSubmit: handleSubmit, noValidate: true }}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit">حفظ التغييرات</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelClass}>اسم المركز</label>
          <input className={inputClass} value={form.name} onChange={setField("name")} />
        </div>

        <div>
          <label className={labelClass}>الهاتف</label>
          <input
            type="text"
            dir="ltr"
            className={inputClass}
            value={form.phone}
            onChange={setField("phone")}
          />
        </div>

        <div>
          <label className={labelClass}>البريد الإلكتروني للمالك (اختياري)</label>
          <input
            type="email"
            dir="ltr"
            placeholder="name@example.com"
            className={inputClass}
            value={form.ownerEmail}
            onChange={setField("ownerEmail")}
          />
          <p className="mt-1 text-sm text-text-muted">{STAFF_EMAIL_HELPER_TEXT}</p>
        </div>

        <div>
          <label className={labelClass}>النوع</label>
          <select className={inputClass} value={form.type} onChange={setField("type")}>
            <option value="MultiTeacher">مركز (متعدد المدرسين)</option>
            <option value="SoloTeacher">مدرس فردي</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>الخطة</label>
          <input className={inputClass} value={form.plan} onChange={setField("plan")} />
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
      </div>
    </AdminModal>
  );
}
