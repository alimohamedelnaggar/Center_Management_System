import { Loader2 } from "@/components/icons";
import { cn } from "@/utils/cn";

const SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

/** Inline loading spinner. */
export default function Spinner({ size = "md", className, label = "جارٍ التحميل" }) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <Loader2
        className={cn("animate-spin text-primary", SIZES[size] ?? SIZES.md, className)}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
