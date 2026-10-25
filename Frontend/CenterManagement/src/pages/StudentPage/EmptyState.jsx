import { Inbox, Plus } from "@/components/icons";

export default function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted">
        <Inbox className="h-7 w-7 text-text-muted" />
      </div>
      <div>
        <p className="text-base font-semibold text-text-main">لا يوجد طلاب</p>
        <p className="mt-1 text-sm text-text-muted">
          جرّب تغيير الفلاتر أو قم بإضافة طالب جديد.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover"
      >
        <Plus className="h-4 w-4" />
        إضافة طالب
      </button>
    </div>
  );
}
