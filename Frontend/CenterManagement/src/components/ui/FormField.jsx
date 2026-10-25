import { cn } from "@/utils/cn";

/**
 * Wraps a form control with a visible label, optional helper text, and an
 * inline (Arabic) error message connected via aria-describedby.
 */
export default function FormField({
  label,
  htmlFor,
  error,
  helper,
  required = false,
  className,
  children,
}) {
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  const helperId = helper && htmlFor ? `${htmlFor}-helper` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-text-main"
        >
          {label}
          {required && (
            <span className="text-status-danger" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
      )}

      {children}

      {error ? (
        <span
          id={errorId}
          role="alert"
          className="text-xs font-medium text-status-danger"
        >
          {typeof error === "string" ? error : error?.message}
        </span>
      ) : helper ? (
        <span id={helperId} className="text-xs text-text-muted">
          {helper}
        </span>
      ) : null}
    </div>
  );
}
