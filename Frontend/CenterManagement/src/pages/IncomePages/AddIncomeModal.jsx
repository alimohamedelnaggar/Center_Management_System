import { Calendar, ChevronDown, X } from "@/components/icons";
import { useEffect, useMemo, useState } from "react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AddIncomeModal({
  open,
  onClose,
  onSave,
  categories = [],
  groups = [],
  requireGroup = false,
  income = null,
}) {
  const emptyForm = useMemo(
    () => ({
      name: "",
      categoryId: "",
      groupId: "",
      amount: "",
      incomeDate: todayISO(),
      notes: "",
    }),
    [],
  );

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;

    if (income) {
      setForm({
        id: income.id,
        name: income.name ?? "",
        categoryId: income.categoryId ?? "",
        groupId: income.groupId ?? "",
        amount: income.amount ?? "",
        incomeDate: income.incomeDate ?? todayISO(),
        notes: income.notes ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [income, open, emptyForm]);

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    onSave?.({
      id: form.id,
      name: form.name.trim(),
      categoryId: form.categoryId,
      groupId: form.groupId || null,
      amount: Number(form.amount),
      incomeDate: form.incomeDate,
      notes: form.notes.trim(),
    });
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-center justify-center 
      overflow-y-auto bg-text-main/40 p-4 font-sans  "
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md max-h-[90vh] 
         flex-col rounded-2xl bg-surface-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="text-base font-bold text-text-main">
            {income ? "تعديل الإيراد" : "إضافة إيراد جديد"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto px-5 py-5 space-y-4
         space-y-4 px-5 py-5"
        >
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              اسم الإيراد
            </label>

            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="مثال: بيع ملزمة مراجعة"
              className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              الفئة
            </label>

            <div className="relative">
              <select
                value={form.categoryId}
                onChange={(e) => handleChange("categoryId", e.target.value)}
                className="w-full appearance-none rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 pe-9 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
              >
                <option value="">-- اختر الفئة --</option>

                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            </div>
          </div>

          {/* Group */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              المجموعة
              {!requireGroup && (
                <span className="font-normal text-text-muted"> (اختياري)</span>
              )}
            </label>

            <div className="relative">
              <select
                value={form.groupId}
                onChange={(e) => handleChange("groupId", e.target.value)}
                className="w-full appearance-none rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 pe-9 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
              >
                <option value="">-- اختر المجموعة --</option>

                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              المبلغ
            </label>

            <div className="flex overflow-hidden rounded-lg border border-surface-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-subtle">
              <span className="flex items-center bg-surface-muted px-3 text-sm text-text-muted">
                جنيه
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
                placeholder="0.00"
                className="w-full border-0 bg-surface-card px-3 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:outline-none"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              التاريخ
            </label>

            <div className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-subtle">
              <Calendar className="h-4 w-4 shrink-0 text-text-muted" />

              <input
                type="date"
                value={form.incomeDate}
                onChange={(e) => handleChange("incomeDate", e.target.value)}
                className="w-full border-0 bg-transparent p-0 text-sm text-text-main focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              ملاحظات
              <span className="font-normal text-text-muted"> (اختياري)</span>
            </label>

            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="اكتب ملاحظات..."
              className="w-full resize-y rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-3 border-t
         border-surface-border px-5 py-4 mb-5"
        >
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
            disabled={requireGroup && !form.groupId}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {income ? "حفظ التعديلات" : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}