import { useState } from "react";
import { ChevronDown, ListFilter, RotateCcw, Search } from "@/components/icons";

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
  const activeCount =
    (search ? 1 : 0) + (group ? 1 : 0) + (status === null ? 0 : 1);
  const [open, setOpen] = useState(activeCount > 0);

  return (
    <section
      aria-label="بحث وفلاتر الطلاب"
      className="rounded-card border border-surface-border bg-surface-card p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            data-testid="students-search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="ابحث باسم الطالب أو رقم الهاتف..."
            aria-label="ابحث باسم الطالب أو رقم الهاتف"
            className="focus-ring min-h-11 w-full rounded-control border border-surface-border bg-surface-bg py-2.5 pe-4 ps-10 text-sm text-text-main transition-colors placeholder:text-text-muted"
          />
        </div>

        <button
          type="button"
          data-testid="students-filters-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="students-filters-panel"
          className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control border border-surface-border bg-surface-card px-4 text-sm font-bold text-text-main transition-colors hover:bg-surface-muted"
        >
          <ListFilter className="h-4 w-4" aria-hidden="true" />
          <span>الفلاتر</span>
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-text-inverse">
              {activeCount}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {open && (
        <div
          id="students-filters-panel"
          data-testid="students-filters-panel"
          className="mt-3 flex flex-col gap-3 border-t border-surface-border pt-3 sm:flex-row sm:flex-wrap sm:items-center"
        >
          <div className="relative">
            <select
              value={group}
              onChange={(event) => onGroupChange(event.target.value)}
              aria-label="تصفية حسب المجموعة"
              className="focus-ring min-h-11 w-full appearance-none rounded-control border border-surface-border bg-surface-bg py-2.5 pe-9 ps-3 text-sm text-text-main sm:w-auto"
            >
              <option value="">كل المجموعات</option>
              {groups?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
          </div>

          <div className="relative">
            <select
              value={status === null ? "" : String(status)}
              onChange={(event) => {
                onStatusChange(
                  event.target.value === "" ? null : event.target.value === "true",
                );
              }}
              aria-label="تصفية حسب الحالة"
              className="focus-ring min-h-11 w-full appearance-none rounded-control border border-surface-border bg-surface-bg py-2.5 pe-9 ps-3 text-sm text-text-main sm:w-auto"
            >
              <option value="">كل الحالات</option>
              <option value="true">نشط</option>
              <option value="false">غير نشط</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
          </div>

          <button
            type="button"
            onClick={onReset}
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-surface-border px-3.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            إعادة تعيين
          </button>
        </div>
      )}
    </section>
  );
}
