import { forwardRef } from "react";
import { cn } from "@/utils/cn";

export const fieldBaseClass =
  "w-full rounded-control border bg-surface-card px-3 py-2.5 text-sm text-text-main transition-colors outline-none placeholder:text-text-muted/70 disabled:cursor-not-allowed disabled:opacity-50";

export function fieldStateClass(error) {
  return error
    ? "border-status-danger focus:border-status-danger focus:ring-2 focus:ring-status-danger/20"
    : "border-surface-border focus:border-primary focus:ring-2 focus:ring-primary/20";
}

const Input = forwardRef(function Input(
  { error = false, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(fieldBaseClass, fieldStateClass(error), className)}
      {...props}
    />
  );
});

export default Input;
