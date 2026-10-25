import { cn } from "@/utils/cn";

const TONES = {
  success: "bg-status-success-bg text-status-success",
  warning: "bg-status-warning-bg text-status-warning",
  danger: "bg-status-danger-bg text-status-danger",
  info: "bg-status-info-bg text-status-info",
  neutral: "bg-surface-muted text-text-muted",
  primary: "bg-primary-subtle text-primary",
};

/**
 * Consistent semantic status pill.
 *
 * <StatusPill tone="success">مدفوع</StatusPill>
 * <StatusPill map={PAYMENT_STATUS} value={status} labels={PAYMENT_LABELS} />
 */
export default function StatusPill({
  tone = "neutral",
  children,
  dot = true,
  className,
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold",
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}

/** Semantic color mapping by domain (single source of truth). */
export const ATTENDANCE_STATUS = {
  present: "success",
  absent: "danger",
  late: "warning",
};

export const PAYMENT_STATUS = {
  paid: "success",
  unpaid: "danger",
  partial: "warning",
};

export const CENTER_STATUS = {
  active: "success",
  suspended: "danger",
  expired: "warning",
};
