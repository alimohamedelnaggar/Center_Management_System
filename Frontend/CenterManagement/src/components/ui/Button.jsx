import { Loader2 } from "@/components/icons";
import { cn } from "@/utils/cn";

const VARIANTS = {
  primary:
    "bg-primary text-primary-contrast shadow-soft hover:bg-primary-hover active:bg-primary-hover",
  secondary:
    "bg-surface-card text-text-main border border-surface-border shadow-soft hover:bg-surface-muted",
  outline:
    "bg-transparent text-text-main border border-surface-border hover:bg-surface-muted",
  danger:
    "bg-status-danger text-white shadow-soft hover:opacity-90 active:opacity-90",
  ghost: "bg-transparent text-text-main hover:bg-surface-muted",
  accent:
    "bg-accent text-white shadow-soft hover:bg-accent-hover active:bg-accent-hover",
};

const SIZES = {
  sm: "h-9 px-3 text-xs gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-10 w-10 p-0 justify-center",
};

/**
 * Primary button component.
 *
 * @param {object} props
 * @param {"primary"|"secondary"|"outline"|"danger"|"ghost"|"accent"} [props.variant="primary"]
 * @param {"sm"|"md"|"lg"|"icon"} [props.size="md"]
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.block=false] full width
 */
export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  block = false,
  disabled = false,
  type = "button",
  className,
  children,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-control font-semibold transition-all duration-200 select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        block && "w-full",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
