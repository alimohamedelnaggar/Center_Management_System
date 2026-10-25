import { ChevronDown, RotateCcw, Search } from "@/components/icons";

export default function StudentFilters({
  search,
  onSearchChange,
  group,
  onGroupChange,
  status,
  onStatusChange,
  groups,
  onReset,
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث باسم الطالب أو رقم الهاتف..."
            aria-label="Search by student name or phone"
            className="focus-ring w-full rounded-lg border border-surface-border bg-surface-bg py-2.5 pl-10 pr-4 text-sm text-text-main placeholder:text-text-muted"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={group}
              onChange={(e) => onGroupChange(e.target.value)}
              aria-label="Filter by group"
              className="focus-ring appearance-none rounded-lg border border-surface-border bg-surface-bg py-2.5 pl-3 pr-9 text-sm text-text-main"
            >
              <option value="">كل المجموعات</option>
              {groups?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          </div>

          <div className="relative">
            <select
              value={String(status)}
              onChange={(e) => {
                onStatusChange(e.target.value === "true");
              }}
              aria-label="Filter by status"
              className="focus-ring appearance-none rounded-lg border border-surface-border bg-surface-bg py-2.5 pl-3 pr-9 text-sm text-text-main"
            >
              <option value="true">نشط</option>
              <option value="false">غير نشط</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          </div>

          <button
            onClick={onReset}
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-surface-border px-3.5 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
          >
            <RotateCcw className="h-4 w-4" />
            إعادة تعيين
          </button>
        </div>
      </div>
    </div>
  );
}
