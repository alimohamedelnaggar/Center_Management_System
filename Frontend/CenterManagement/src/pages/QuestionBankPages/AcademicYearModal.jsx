import { useEffect, useState } from "react";
import { X } from "@/components/icons";

export default function AcademicYearModal({
  open = true,
  year = null,
  onClose,
  onSave,
}) {
  const [name, setName] = useState("");
  const [order, setOrder] = useState(0);

  useEffect(() => {
    setName(year?.name ?? "");
    setOrder(year?.order ?? 0);
  }, [year, open]);

  if (!open) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave?.({ name: name.trim(), order: Number(order) || 0 });
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
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="text-base font-bold text-text-main">
            {year ? "تعديل السنة الدراسية" : "إضافة سنة دراسية"}
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

        <div className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              اسم السنة الدراسية
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: أولي ثانوي"
              autoFocus
              className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              الترتيب
            </label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              min={0}
              className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
            />
          </div>
        </div>

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