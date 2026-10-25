import { LogOut, Moon, Sun, UserRound } from "@/components/icons";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useBranding } from "../context/useBranding";
import { useTheme } from "../context/useTheme";
import { resolveImageUrl } from "../utils/media";
import {
  NAV_ITEMS,
  canSeeNavItem,
  navLabel,
  navRoleContext,
} from "../constants/modules";

const roleLabels = {
  SuperAdmin: { title: "مدير المنصة", subtitle: "إدارة المراكز والاشتراكات" },
  CenterOwner: { title: "صاحب المركز", subtitle: "إدارة المركز والمدرسين" },
  Assistant: { title: "حساب المساعد", subtitle: "مساعد" },
  Teacher: { title: "حساب المدرس", subtitle: "مدرس" },
};

const soloTeacherLabel = { title: "حساب المدرس", subtitle: "مدرس / صاحب المركز" };

export default function AppSidebar() {
  const navigate = useNavigate();
  const { logout, role, isCenterAdmin, hasModule, centerType, centerTypeLoaded } =
    useAuth();
  const { center, title } = useBranding();
  const { isDark, toggle: toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const ctx = navRoleContext({ role, isCenterAdmin, centerType });
  const isSoloTeacher = ctx.isSoloTeacher;

  // Do not render nav items until the center type is known; otherwise a solo
  // center would flash the multi-teacher "إدارة المدرسين" item before /me lands.
  const visibleNavItems = centerTypeLoaded
    ? NAV_ITEMS.filter(
        (item) => canSeeNavItem(item, ctx) && hasModule(item.module || "core"),
      )
    : [];
  const identity = isSoloTeacher
    ? soloTeacherLabel
    : roleLabels[role] ?? { title: "حساب", subtitle: role ?? "" };

  const logoUrl = resolveImageUrl(center?.logoUrl);
  const brandName = center?.name || identity.title;
  const brandInitial = (center?.name || "Edu").trim().charAt(0).toUpperCase();

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3.5 rounded-xl px-3 md:px-4 py-3 font-medium text-sm transition-all duration-200 ${
      isActive
        ? "bg-primary text-text-inverse shadow-sm"
        : "text-text-muted hover:bg-surface-muted hover:text-text-main"
    }`;

  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col justify-between border-l border-surface-border bg-surface-card shadow-sm md:w-64">
      <div className="flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-surface-border px-3 py-4 md:mb-4 md:px-4 md:pt-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-lg font-bold text-text-inverse shadow-sm">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName}
                className="h-full w-full object-cover"
              />
            ) : (
              brandInitial
            )}
          </div>
          <h2 className="hidden truncate text-lg font-bold text-text-main md:block">
            {title}
          </h2>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-2 pb-4 md:px-4">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const itemTitle = navLabel(item, ctx);
            return (
              <NavLink key={item.path} to={item.path} className={linkClass} title={itemTitle}>
                <Icon className="h-5 w-5 shrink-0" />
                <span className="hidden truncate md:inline">{itemTitle}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-surface-border px-2 py-4 md:px-4">
        <div className="mb-3 flex items-center gap-3 px-1 md:px-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle font-bold text-primary">
            <UserRound className="h-4 w-4" />
          </div>
          <div className="hidden min-w-0 text-xs md:block">
            <p className="truncate font-semibold text-text-main">{identity.title}</p>
            <p className="truncate text-text-muted">{identity.subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
          aria-label={isDark ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
          className="mb-2 flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-medium text-text-muted transition-all duration-200 hover:bg-surface-muted hover:text-text-main active:scale-95 md:px-4"
        >
          {isDark ? (
            <Sun className="h-5 w-5 shrink-0" />
          ) : (
            <Moon className="h-5 w-5 shrink-0" />
          )}
          <span className="hidden whitespace-nowrap md:inline">
            {isDark ? "الوضع النهاري" : "الوضع الليلي"}
          </span>
        </button>

        <button
          onClick={handleLogout}
          title="تسجيل خروج"
          className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-medium text-status-danger transition-all duration-200 hover:bg-status-danger-bg active:scale-95 md:px-4"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="hidden whitespace-nowrap md:inline">تسجيل خروج</span>
        </button>
      </div>
    </aside>
  );
}