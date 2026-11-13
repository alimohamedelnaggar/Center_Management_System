import { cloneElement, isValidElement, useId } from "react";
import { cn } from "@/utils/cn";

/**
 * One shared layout for every "this is not the normal page" screen:
 * locked modules, disabled portals, 404, the crash boundary and the
 * subscription/access overlay. Keeping them identical means a user always
 * recognises the situation, the escape action stays in the same place, and we
 * do not grow five slightly different cards.
 *
 * Surface:
 * - page     → full viewport (404, crash boundary, portal gates)
 * - embedded → fills the content area inside the sidebar shell (module lock)
 * - overlay  → fixed sheet above the app (access blocked)
 */

const TONES = {
  primary: {
    badge: "bg-primary-subtle text-primary ring-primary/15",
    eyebrow: "text-primary",
  },
  warning: {
    badge: "bg-status-warning-bg text-status-warning ring-status-warning/20",
    eyebrow: "text-status-warning",
  },
  danger: {
    badge: "bg-status-danger-bg text-status-danger ring-status-danger/20",
    eyebrow: "text-status-danger",
  },
  info: {
    badge: "bg-status-info-bg text-status-info ring-status-info/20",
    eyebrow: "text-status-info",
  },
};

const SURFACES = {
  page: "min-h-screen bg-surface-bg px-4 py-10",
  embedded: "min-h-[60vh] px-4 py-8",
  overlay: "fixed inset-0 z-[99999] bg-black/60 px-4 py-6 backdrop-blur-sm",
};

const VARIANTS = {
  primary:
    "border border-transparent bg-primary text-primary-contrast hover:bg-primary-hover",
  secondary:
    "border border-surface-border bg-surface-card text-text-main hover:bg-surface-muted",
  danger:
    "border border-status-danger/35 bg-status-danger-bg/50 text-status-danger hover:bg-status-danger-bg",
};

/** Shared anchor classes, exported so callers can pass a router <Link>. */
export function screenActionClass(variant = "primary") {
  return cn(
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-action px-5 py-2.5 text-sm font-bold",
    "transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    "sm:w-auto",
    VARIANTS[variant] ?? VARIANTS.primary,
  );
}

export default function ScreenState({
  surface = "page",
  tone = "primary",
  icon: Icon,
  eyebrow,
  title,
  description,
  meta = null,
  decoration = null,
  actions = [],
  footer = null,
  headingAs: Heading = "h1",
  role,
  testId = "screen-state",
  className,
}) {
  const palette = TONES[tone] ?? TONES.primary;
  const titleId = useId();

  return (
    <div
      dir="rtl"
      data-testid={testId}
      className={cn(
        "flex items-center justify-center text-text-main",
        SURFACES[surface] ?? SURFACES.page,
        className,
      )}
    >
      <div
        role={role}
        aria-modal={role === "alertdialog" ? "true" : undefined}
        aria-labelledby={role ? titleId : undefined}
        className={cn(
          "state-card relative w-full max-w-lg overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-card",
          surface === "overlay" && "max-w-md",
        )}
      >
        {decoration}

        {/* Decorative halo; kept out of the text ancestry so contrast checks
            measure the solid card, not a gradient. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 start-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/10 blur-2xl"
        />

        <div className="relative flex flex-col items-center gap-4 p-6 text-center sm:p-8">
          {Icon && (
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-card ring-8",
                palette.badge,
              )}
            >
              <Icon aria-hidden="true" className="h-8 w-8" />
            </div>
          )}

          {eyebrow && (
            <p
              className={cn(
                "text-xs font-bold tracking-wide",
                palette.eyebrow,
              )}
            >
              {eyebrow}
            </p>
          )}

          <div className="space-y-2">
            <Heading
              id={titleId}
              className="text-balance text-2xl font-black leading-snug text-text-main"
            >
              {title}
            </Heading>

            {description && (
              <p className="text-pretty text-sm leading-relaxed text-text-muted">
                {description}
              </p>
            )}
          </div>

          {meta && (
            <div className="rounded-control bg-surface-muted px-3 py-2 text-sm text-text-muted">
              {meta}
            </div>
          )}

          {actions.length > 0 && (
            <div className="flex w-full flex-col gap-2 pt-1 sm:flex-row sm:justify-center">
              {actions.filter(Boolean).map((action, index) => {
                const variant = action.variant ?? "primary";
                const classes = screenActionClass(variant);
                const ActionIcon = action.icon;

                if (action.element) {
                  const element = isValidElement(action.element)
                    ? cloneElement(action.element, {
                        "data-testid": action.testId,
                      })
                    : action.element;

                  return (
                    <span key={action.key ?? index} className="contents">
                      {element}
                    </span>
                  );
                }

                const content = (
                  <>
                    {ActionIcon && (
                      <ActionIcon aria-hidden="true" className="h-4 w-4" />
                    )}
                    <span>{action.label}</span>
                  </>
                );

                if (action.href) {
                  return (
                    <a
                      key={action.key ?? action.label}
                      href={action.href}
                      target={action.external ? "_blank" : undefined}
                      rel={action.external ? "noreferrer" : undefined}
                      data-testid={action.testId}
                      className={classes}
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <button
                    key={action.key ?? action.label}
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    data-testid={action.testId}
                    className={cn(classes, "disabled:opacity-60")}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          )}

          {footer && (
            <div className="flex items-start justify-center gap-1.5 border-t border-surface-border pt-4 text-xs leading-relaxed text-text-muted">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
