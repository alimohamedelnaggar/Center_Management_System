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
        "flex items-center gap-4 rounded-card border border-surface-border bg-surface-card p-4 shadow-soft",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-control",
            TONES[tone] ?? TONES.primary,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}

      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-text-muted">{label}</p>
        <p className="mt-0.5 truncate text-xl font-bold text-text-main tabular-nums">
          {value}
        </p>
        {hint && <p className="mt-0.5 truncate text-xs text-text-muted">{hint}</p>}
      </div>
    </div>
  );
}
