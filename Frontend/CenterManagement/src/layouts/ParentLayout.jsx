import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun, UserRound } from "@/components/icons";
import NotificationBell from "../components/Student/NotificationBell";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/useTheme";
import { parentPortalService } from "../services/parentPortalService";

export default function ParentLayout() {
  const { logout } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const openNotification = (notification) => {
    if (notification?.studentId) {
      navigate(`/parent/children/${notification.studentId}`);
    }
  };

  return (
    <div dir="rtl" className="app-shell flex-col">
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-surface-border bg-surface-card px-4 py-3 md:px-6"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-primary text-sm font-bold text-primary-contrast shadow-soft">
            Edu
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-text-main">
              بوابة ولي الأمر
            </p>
            <p className="truncate text-xs text-text-muted">متابعة أبنائك</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell
            service={parentPortalService}
            onSelect={openNotification}
            viewAllPath="/parent/notifications"
          />

          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
            aria-label={isDark ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-surface-border bg-surface-card text-text-muted transition-colors duration-150 hover:bg-surface-muted hover:text-text-main"
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-11 items-center gap-2 rounded-action border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-status-danger transition-colors duration-150 hover:bg-status-danger-bg"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">تسجيل خروج</span>
          </button>
        </div>
      </header>

      <main className="min-w-0 flex-1 pb-[env(safe-area-inset-bottom,0px)]">
        <Outlet />
      </main>
    </div>
  );
}
