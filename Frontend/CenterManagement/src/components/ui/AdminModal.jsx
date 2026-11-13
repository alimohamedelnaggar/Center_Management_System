import { useEffect, useId } from "react";
import { X } from "@/components/icons";
import { cn } from "@/utils/cn";

/**
 * Shared admin dialog shell (teachers, assistants, centers, salaries).
 *
 * - The body scrolls; the header and the footer do not, so the primary action
 *   is always reachable on a long form or a short phone screen.
 * - When `formProps` is supplied the body and the footer live inside one
 *   `<form>`, which keeps native submit (and Enter) working while the footer
 *   still sits outside the scrolling area.
 * - On phones it docks to the bottom as a sheet; from `sm` it is a centred card.
 */
export default function AdminModal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  testId,
  children,
  footer,
  busy = false,
  size = "max-w-lg",
  bodyClassName,
  formProps,
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy) {
        event.stopPropagation();
        onClose?.();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const body = (
    <div
      data-testid={testId ? `${testId}-body` : undefined}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4",
        bodyClassName,
      )}
    >
      {children}
    </div>
  );

  const footerNode = footer ? (
    <div
      data-testid={testId ? `${testId}-footer` : undefined}
      className="shrink-0 border-t border-surface-border bg-surface-card px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      {footer}
    </div>
  ) : null;

  const content = formProps ? (
    <form
      {...formProps}
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        formProps.className,
      )}
    >
      {body}
      {footerNode}
    </form>
  ) : (
    <>
      {body}
      {footerNode}
    </>
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/45 backdrop-blur-xs sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        dir="rtl"
        className={cn(
          "state-card flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-card border border-surface-border bg-surface-card text-right text-text-main shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-card",
          size,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary-subtle text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <h2
                id={titleId}
                className="truncate text-lg font-bold tracking-tight text-text-main"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="إغلاق"
            className="focus-ring -me-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {content}
      </div>
    </div>
  );
}
