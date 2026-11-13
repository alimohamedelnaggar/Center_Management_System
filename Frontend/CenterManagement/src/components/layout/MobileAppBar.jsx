import { List } from "@/components/icons";

/**
 * Mobile-only top bar. Opens the navigation drawer and keeps a stable
 * landmark at the top of the viewport (safe-area aware).
 */
export default function MobileAppBar({
  title,
  subtitle,
  onMenu,
  menuOpen = false,
  actions = null,
}) {
  return (
    <header className="mobile-topbar md:hidden">
      <button
        type="button"
        onClick={onMenu}
        aria-label="فتح القائمة"
        aria-controls="mobile-nav-drawer"
        aria-expanded={menuOpen}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-surface-border bg-surface-card text-text-main transition-colors duration-150 hover:bg-surface-muted"
      >
        <List className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-text-main">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-text-muted">{subtitle}</p>
        )}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}
