import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";

/**
 * Shared building blocks for the student and parent portals. They keep the
 * mobile-first card language identical across every portal screen while the
 * desktop tables reuse the very same data.
 */

const TONES = {
  primary: {
    tile: "bg-primary-subtle text-primary",
    value: "text-text-main",
    pill: "bg-primary-subtle text-primary",
  },
  success: {
    tile: "bg-status-success-bg text-status-success",
    value: "text-status-success",
    pill: "bg-status-success-bg text-status-success",
  },
  danger: {
    tile: "bg-status-danger-bg text-status-danger",
    value: "text-status-danger",
    pill: "bg-status-danger-bg text-status-danger",
  },
  warning: {
    tile: "bg-status-warning-bg text-status-warning",
    value: "text-status-warning",
    pill: "bg-status-warning-bg text-status-warning",
  },
  info: {
    tile: "bg-status-info-bg text-status-info",
    value: "text-status-info",
    pill: "bg-status-info-bg text-status-info",
  },
  neutral: {
    tile: "bg-surface-muted text-text-muted",
    value: "text-text-main",
    pill: "bg-surface-muted text-text-muted",
  },
};

export function toneOf(tone) {
  return TONES[tone] ?? TONES.primary;
}

/** A large, legible number card. Renders as a link when `to` is provided. */
export function PortalStat({
  icon: Icon,
  label,
  value,
  tone = "primary",
  to,
  hint,
  className,
  testId,
}) {
  const palette = toneOf(tone);
  const content = (
    <>
      <span
        className={cn(
          "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-control",
          palette.tile,
        )}
      >
        {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
      </span>
      <span className="block text-2xl font-extrabold leading-tight tabular-nums text-text-main sm:text-3xl">
        {value}
      </span>
      <span className="mt-1 block text-sm font-medium leading-5 text-text-muted">
        {label}
      </span>
      {hint && (
        <span className="mt-0.5 block text-xs text-text-muted">{hint}</span>
      )}
    </>
  );

  const classes = cn(
    "flex min-w-0 flex-col rounded-card border border-surface-border bg-surface-card p-4 shadow-soft",
    to && "transition hover:border-primary/60 hover:shadow-md",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={classes} data-testid={testId}>
        {content}
      </Link>
    );
  }

  return (
    <div className={classes} data-testid={testId}>
      {content}
    </div>
  );
}

/** Standard panel with a header. */
export function PortalSection({
  icon: Icon,
  title,
  action,
  children,
  className,
  bodyClassName,
  testId,
}) {
  return (
    <section
      className={cn(
        // min-w-0 keeps a grid/flex parent from sizing its track to the
        // longest unbreakable child (truncated rows, chart labels).
        "min-w-0 rounded-card border border-surface-border bg-surface-card shadow-soft",
        className,
      )}
      data-testid={testId}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border px-4 py-3 sm:px-5">
        <h2 className="inline-flex min-w-0 items-center gap-2 text-base font-bold text-text-main">
          {Icon && <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
          <span className="min-w-0 break-words">{title}</span>
        </h2>
        {action}
      </header>
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Empty state shared by every portal list. */
export function PortalEmpty({ icon: Icon, title, description, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-surface-border bg-surface-card px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-control bg-primary-subtle text-primary">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
      )}
      <p className="text-base font-bold text-text-main">{title}</p>
      {description && (
        <p className="max-w-sm text-sm leading-6 text-text-muted">{description}</p>
      )}
    </div>
  );
}

/** Status pill with a stable size so it never shifts a row on a phone. */
export function PortalStatus({ tone = "neutral", children, className }) {
  const palette = toneOf(tone);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
        palette.pill,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Loading block used while a portal page fetches its data. */
export function PortalLoading({ label = "جاري التحميل...", icon: Icon }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-card border border-surface-border bg-surface-card px-4 py-14 text-sm font-medium text-text-muted">
      {Icon && <Icon className="h-5 w-5 animate-spin" aria-hidden="true" />}
      {label}
    </div>
  );
}
