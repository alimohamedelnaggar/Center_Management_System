import { useEffect } from "react";
import { LogOut, Moon, Sun, UserRound } from "@/components/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/useTheme";
import useAppNavigation from "../hooks/useAppNavigation";
import SidebarPanel from "./layout/SidebarPanel";

export default function AppSidebar({ nav, mobileOpen = false, onMobileClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const internalNav = useAppNavigation();
  const data = nav ?? internalNav;

  const handleLogout = () => {
    onMobileClose?.();
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onMobileClose?.();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen, onMobileClose]);

  const footer = (
    <>
      <button
        type="button"
        onClick={toggleTheme}
        title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
        aria-label={isDark ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
        className="sidebar-footer-btn mb-1 flex min-h-11 w-full items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium text-text-muted transition-colors duration-150 hover:bg-surface-muted hover:text-text-main"
      >
        {isDark ? (
          <Sun className="h-5 w-5 shrink-0" aria-hidden="true" />
        ) : (
          <Moon className="h-5 w-5 shrink-0" aria-hidden="true" />
        )}
        <span className="sidebar-label whitespace-nowrap">
          {isDark ? "الوضع النهاري" : "الوضع الليلي"}
        </span>
      </button>

      <button
        type="button"
        onClick={handleLogout}
        title="تسجيل خروج"
        className="sidebar-footer-btn flex min-h-11 w-full items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium text-status-danger transition-colors duration-150 hover:bg-status-danger-bg"
      >
        <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="sidebar-label whitespace-nowrap">تسجيل خروج</span>
      </button>
    </>
  );

  const brand = {
    logoUrl: data.logoUrl,
    initial: data.brandInitial,
    name: data.brandName,
    title: data.brandTitle ?? data.brandName,
    caption: data.identity.subtitle,
  };

  const identity = {
    icon: <UserRound className="h-4 w-4" aria-hidden="true" />,
    title: data.identity.title,
    subtitle: data.identity.subtitle,
  };

  return (
    <>
      <SidebarPanel
        className="app-sidebar hidden md:flex"
        brand={brand}
        items={data.visibleNavItems}
        identity={identity}
        footer={footer}
      />

      {mobileOpen && (
        <div
          className="app-scrim md:hidden"
          aria-hidden="true"
          onClick={onMobileClose}
        />
      )}

      <div
        id="mobile-nav-drawer"
        data-open={mobileOpen ? "true" : "false"}
        className="app-drawer md:hidden"
        role="dialog"
        aria-modal={mobileOpen ? "true" : undefined}
        aria-label="القائمة الرئيسية"
        inert={!mobileOpen}
      >
        <SidebarPanel
          brand={brand}
          items={data.visibleNavItems}
          identity={identity}
          footer={footer}
          onNavigate={onMobileClose}
        />
      </div>
    </>
  );
}
