import { Inbox, Plus, RotateCcw } from "@/components/icons";

export default function EmptyState({ onAdd, filtered = false, onReset }) {
  return (
    <div
      data-testid="students-empty"
      className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted">
        <Inbox className="h-7 w-7 text-text-muted" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-semibold text-text-main">
          {filtered ? "لا توجد نتائج مطابقة" : "لا يوجد طلاب"}
        </p>
        <p className="mt-1 text-sm text-text-muted">
          {filtered
            ? "امسح البحث أو الفلاتر لعرض كل الطلاب."
            : "جرّب تغيير الفلاتر أو قم بإضافة طالب جديد."}
        </p>
      </div>
      {filtered ? (
        <button
          type="button"
          onClick={onReset}
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-action border border-surface-border px-4 text-sm font-bold text-text-main transition-colors hover:bg-surface-muted"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          مسح الفلاتر
        </button>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-action bg-primary px-4 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          إضافة طالب
        </button>
      )}
    </div>
  );
}
