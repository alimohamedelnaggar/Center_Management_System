import { useEffect, useRef } from "react";
import { X } from "@/components/icons";
import { cn } from "@/utils/cn";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "2xl": "max-w-4xl",
};

/**
 * Accessible base dialog: closes on Escape and backdrop click, locks body
 * scroll, moves focus into the panel, and restores focus on close.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = "md",
  showClose = true,
  closeOnBackdrop = true,
  footer = null,
  className,
  children,
}) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      window.clearTimeout(focusTimer);
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus?.();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full rounded-card border border-surface-border bg-surface-card shadow-elevated outline-none",
          SIZES[size] ?? SIZES.md,
          className,
        )}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
            <div className="min-w-0">
              {title && (
                <h3 className="text-base font-bold text-text-main">{title}</h3>
              )}
              {description && (
                <p className="mt-0.5 text-xs text-text-muted">{description}</p>
              )}
            </div>

            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="rounded-lg p-1 text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        <div className="px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-surface-border px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
