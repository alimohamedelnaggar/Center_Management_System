import { forwardRef } from "react";
import { cn } from "@/utils/cn";
import { fieldBaseClass, fieldStateClass } from "./Input";

const Select = forwardRef(function Select(
  { error = false, className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        fieldBaseClass,
        fieldStateClass(error),
        "cursor-pointer appearance-none bg-no-repeat pe-9",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: "left 0.75rem center",
        backgroundSize: "16px",
      }}
      {...props}
    >
      {children}
    </select>
  );
});

export default Select;
