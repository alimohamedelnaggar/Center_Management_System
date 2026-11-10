import { forwardRef } from "react";
import { cn } from "@/utils/cn";

export const fieldBaseClass =
  "w-full min-h-11 rounded-control border bg-surface-bg/70 px-3 py-2.5 text-base text-text-main transition-colors duration-150 outline-none placeholder:text-text-muted/70 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm";

export function fieldStateClass(error) {
  return error
    ? "border-status-danger focus:border-status-danger focus:ring-[3px] focus:ring-status-danger/20"
    : "border-surface-border focus:border-primary focus:bg-surface-card focus:ring-[3px] focus:ring-primary/20";
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
