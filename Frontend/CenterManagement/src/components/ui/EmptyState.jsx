import { Inbox } from "@/components/icons";
import { cn } from "@/utils/cn";

/** Friendly empty state with an optional action. */
export default function EmptyState({
  icon: Icon = Inbox,
  title = "لا توجد بيانات",
  description,
  action = null,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-text-muted">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <p className="font-semibold text-text-main">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
