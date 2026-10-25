import { forwardRef } from "react";
import { cn } from "@/utils/cn";
import { fieldBaseClass, fieldStateClass } from "./Input";

const Textarea = forwardRef(function Textarea(
  { error = false, rows = 4, className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(fieldBaseClass, fieldStateClass(error), "resize-y", className)}
      {...props}
    />
  );
});

export default Textarea;
