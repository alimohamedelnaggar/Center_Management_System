import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Building2 } from "@/components/icons";

import AdminModal from "../ui/AdminModal";
import Button from "../ui/Button";
import { fieldBaseClass } from "../ui/Input";

const inputClass = fieldBaseClass;
const labelClass = "mb-1.5 block text-sm font-medium text-text-main";

export default function CenterModal({ isOpen, onClose, onSubmit, initialData }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
        description: initialData.description || "",
      });
    } else {
      setFormData({ name: "", phone: "", address: "", description: "" });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("يرجى إدخال اسم المركز!");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open={isOpen}
      onClose={onClose}
      busy={saving}
      title={initialData ? "تعديل المركز" : "إضافة مركز جديد"}
      icon={Building2}
      testId="center-modal"
      formProps={{ onSubmit: handleSubmit, noValidate: true }}
      footer={
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="flex-1"
          >
            إلغاء
          </Button>
          <Button type="submit" loading={saving} className="flex-1">
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={labelClass}>اسم المركز *</label>
          <input
            type="text"
            className={inputClass}
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
          />
        </div>
        <div>
          <label className={labelClass}>رقم الهاتف</label>
          <input
            type="text"
            dir="ltr"
            placeholder="01012345678"
            className={inputClass}
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />
        </div>
        <div>
          <label className={labelClass}>العنوان</label>
          <input
            type="text"
            className={inputClass}
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
          />
        </div>
        <div>
          <label className={labelClass}>وصف</label>
          <textarea
            rows={3}
            className={inputClass}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>
      </div>
    </AdminModal>
  );
}
