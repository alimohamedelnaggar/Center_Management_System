import { AlertCircle } from "@/components/icons";
import Button from "./Button";
import { cn } from "@/utils/cn";

/** Error state with a recovery path (retry). */
export default function ErrorState({
  title = "حدث خطأ",
  description = "تعذّر تحميل البيانات. يرجى المحاولة مرة أخرى.",
  onRetry,
  retryText = "إعادة المحاولة",
  className,
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-danger-bg text-status-danger">
        <AlertCircle className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <p className="font-semibold text-text-main">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        )}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryText}
        </Button>
      )}
    </div>
  );
}
