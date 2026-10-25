import { useEffect, useState } from "react";

export default function AddIncomeCategoryModal({
  open = true,
  category = null,
  onClose,
  onSave,
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(category?.name ?? "");
  }, [category, open]);

  if (!open) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave?.({ name: name.trim() });
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/40 px-4 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-surface-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="text-base font-bold text-text-main">
            {category ? "تعديل فئة الإيراد" : "إضافة فئة إيراد جديدة"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <label className="mb-1.5 block text-sm font-medium text-text-main">
            اسم فئة الإيراد
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: كتب ملزمة"
            autoFocus
            className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-surface-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-surface-border bg-surface-card py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-surface-muted"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}