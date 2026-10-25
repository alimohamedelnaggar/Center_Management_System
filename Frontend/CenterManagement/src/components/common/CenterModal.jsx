import { X } from "@/components/icons";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-lg max-h-[90vh] flex-col rounded-2xl border border-surface-border bg-surface-card shadow-2xl">
        <div className="shrink-0 flex items-center justify-between border-b border-surface-border p-6">
          <h2 className="text-xl font-extrabold text-text-main">
            {initialData ? "تعديل المركز" : "إضافة مركز جديد"}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-main"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1 text-text-main">
              اسم المركز *
            </label>
            <input
              type="text"
              className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-text-main">
              رقم الهاتف
            </label>
            <input
              type="text"
              placeholder="01012345678"
              className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-text-main">
              العنوان
            </label>
            <input
              type="text"
              className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-text-main">
              وصف
            </label>
            <textarea
              rows={3}
              className="w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
          <div className="sticky bottom-0 shrink-0 flex gap-3 border-t border-surface-border bg-surface-card pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl border border-surface-border text-text-muted hover:bg-surface-muted font-bold transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-1/2 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
