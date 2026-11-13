import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn";

/**
 * Presentational sidebar body shared by the desktop rail and the mobile
 * drawer. The wrapper owns positioning/width; this component owns structure,
 * so both surfaces always stay in sync.
 */
export default function SidebarPanel({
  id,
  brand,
  items,
  identity,
  footer,
  onNavigate,
  className,
}) {
  return (
    <aside id={id} className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center gap-3 border-b border-surface-border px-3 py-4">
        <div className="sidebar-logo flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-control bg-primary text-lg font-bold text-primary-contrast shadow-soft">
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={brand.name}
              className="h-full w-full object-cover"
            />
          ) : (
            brand.initial
          )}
        </div>
        <div className="sidebar-brand-text min-w-0">
          <h2 className="truncate text-base font-bold text-text-main">
            {brand.title}
          </h2>
          <p className="truncate text-xs text-text-muted">{brand.caption}</p>
        </div>
      </div>

      <nav
        aria-label="التنقل الرئيسي"
        className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-3"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.label}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "sidebar-link relative flex min-h-11 items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-primary-subtle font-bold text-primary"
                    : "text-text-muted hover:bg-surface-muted hover:text-text-main",
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="sidebar-label truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-surface-border px-2 py-3">
        <div className="sidebar-identity mb-3 flex items-center gap-3 rounded-control bg-surface-bg px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle font-bold text-primary">
            {identity.icon}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-main">
              {identity.title}
            </p>
            <p className="truncate text-xs text-text-muted">
              {identity.subtitle}
            </p>
          </div>
        </div>

        {footer}
      </div>
    </aside>
  );
}
