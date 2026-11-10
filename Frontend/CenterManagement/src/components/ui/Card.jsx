import { cn } from "@/utils/cn";

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "cq-host rounded-card border border-surface-border bg-surface-card shadow-soft",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-surface-border px-4 py-4 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {title && (
          <h3 className="text-base font-bold leading-snug text-text-main">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }) {
  return (
    <div className={cn("p-4 sm:p-5", className)}>{children}</div>
  );
}

export function CardFooter({ className, children }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-3 border-t border-surface-border px-4 py-4 sm:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default Card;
