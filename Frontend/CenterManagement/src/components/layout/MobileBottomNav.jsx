import { Link, useLocation } from "react-router-dom";
import { MoreHorizontal } from "@/components/icons";
import { cn } from "@/utils/cn";

/**
 * Mobile bottom navigation: four primary destinations + a "more" button that
 * opens the full drawer. Hidden on tablets and in short landscape viewports
 * (see `.mobile-bottom-nav` in index.css).
 */
export default function MobileBottomNav({ items = [], onMore, staticPreview = false }) {
  const location = useLocation();
  const primary = items.slice(0, 4);
  const moreActive =
    items.length > 4 &&
    items
      .slice(4)
      .some((item) => location.pathname.startsWith(item.path));

  return (
    <nav
      className={cn(
        "mobile-bottom-nav md:hidden",
        staticPreview && "relative !flex",
      )}
      aria-label="التنقل السريع"
    >
      {primary.map((item) => {
        const Icon = item.icon;
        const isActive =
          location.pathname === item.path ||
          location.pathname.startsWith(`${item.path}/`);
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={isActive ? "page" : undefined}
            title={item.label}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}

      {items.length > 4 && (
        <button
          type="button"
          onClick={onMore}
          aria-label="المزيد من الصفحات"
          className={cn(moreActive && "text-primary")}
          title="المزيد"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          <span>المزيد</span>
        </button>
      )}
    </nav>
  );
}
