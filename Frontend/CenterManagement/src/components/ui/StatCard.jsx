import { cn } from "@/utils/cn";

const TONES = {
  primary: "bg-primary-subtle text-primary",
  success: "bg-status-success-bg text-status-success",
  warning: "bg-status-warning-bg text-status-warning",
  danger: "bg-status-danger-bg text-status-danger",
  info: "bg-status-info-bg text-status-info",
  neutral: "bg-surface-muted text-text-muted",
};

/**
 * Compact KPI card for dashboards and list summaries.
 *
 * @param {object} props
 * @param {import("react").ComponentType} [props.icon]
 * @param {"primary"|"success"|"warning"|"danger"|"info"|"neutral"} [props.tone="primary"]
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  hint,
  className,
}) {
  return (
    <div
      className={cn(
        "flex h-full items-center gap-3 rounded-card border border-surface-border bg-surface-card p-4 shadow-soft sm:gap-4 sm:p-5",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-control",
            TONES[tone] ?? TONES.primary,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}

      <div className="min-w-0">
        <p className="break-words text-sm font-medium text-text-muted">{label}</p>
        <p className="num mt-0.5 break-words text-2xl font-bold leading-tight text-text-main">
          {value}
        </p>
        {hint && (
          <p className="mt-0.5 break-words text-sm text-text-muted">{hint}</p>
        )}
      </div>
    </div>
  );
}
