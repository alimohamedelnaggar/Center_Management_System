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
  soft: "bg-primary-subtle text-primary hover:bg-primary-light/20",
  accent:
    "bg-accent text-white shadow-soft hover:bg-accent-hover active:bg-accent-hover",
};

const SIZES = {
  sm: "min-h-11 px-3.5 text-xs gap-1.5",
  md: "min-h-11 px-5 text-sm gap-2",
  lg: "min-h-12 px-6 text-base gap-2",
  icon: "min-h-11 h-11 w-11 p-0 justify-center",
};

/**
 * Primary button component.
 *
 * @param {object} props
 * @param {"primary"|"secondary"|"outline"|"danger"|"ghost"|"soft"|"accent"} [props.variant="primary"]
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
        "inline-flex items-center justify-center rounded-action font-bold transition-all duration-150 select-none",
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
