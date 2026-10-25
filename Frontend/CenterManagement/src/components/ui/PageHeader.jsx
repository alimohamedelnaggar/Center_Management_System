import { Link } from "react-router-dom";
import { ChevronLeft } from "@/components/icons";
import { cn } from "@/utils/cn";

/**
 * Consistent page header: optional breadcrumbs, title, subtitle, and actions.
 *
 * @param {{ label: string, to?: string }[]} [props.breadcrumbs]
 */
export default function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  actions = null,
  className,
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {breadcrumbs.length > 0 && (
        <nav
          aria-label="مسار التنقل"
          className="flex items-center gap-1 text-xs text-text-muted"
        >
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="transition-colors hover:text-primary"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-text-main">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-text-main md:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
