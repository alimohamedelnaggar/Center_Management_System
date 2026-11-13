import { useEffect } from "react";
import {
  Bell,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  NotebookText,
  Star,
  UserRound,
  Wallet,
} from "@/components/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import SidebarPanel from "./layout/SidebarPanel";

export const STUDENT_NAV_ITEMS = [
  { title: "لوحة التحكم", path: "/student/dashboard", icon: LayoutDashboard, module: "core" },
  { title: "امتحاناتي", path: "/student/exams", icon: ClipboardList, module: "online_exams" },
  { title: "النتائج", path: "/student/results", icon: Star, module: "grades" },
  { title: "المذكرات", path: "/student/notes", icon: NotebookText, module: "study_notes" },
  { title: "الحضور والغياب", path: "/student/attendance", icon: CalendarCheck, module: "attendance" },
  { title: "المدفوعات", path: "/student/payments", icon: Wallet, module: "payments" },
  { title: "الإشعارات", path: "/student/notifications", icon: Bell, module: "core" },
  { title: "الملف الشخصي", path: "/student/profile", icon: UserRound, module: "core" },
];

export function visibleStudentNavItems(hasCenterModule) {
  return STUDENT_NAV_ITEMS.filter((item) => hasCenterModule(item.module)).map(
    (item) => ({ ...item, label: item.title }),
  );
}

export default function StudentSidebar({ mobileOpen = false, onMobileClose }) {
  const navigate = useNavigate();
  const { logout, hasCenterModule } = useAuth();
  const items = visibleStudentNavItems(hasCenterModule);

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
    <button
      type="button"
      onClick={handleLogout}
      title="تسجيل خروج"
      className="sidebar-footer-btn flex min-h-11 w-full items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium text-status-danger transition-colors duration-150 hover:bg-status-danger-bg"
    >
      <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="sidebar-label whitespace-nowrap">تسجيل خروج</span>
    </button>
  );

  const brand = {
    initial: "Edu",
    name: "Edu",
    title: "بوابة الطالب",
    caption: "متابعة رحلتك الدراسية",
  };

  const identity = {
    icon: <UserRound className="h-4 w-4" aria-hidden="true" />,
    title: "حساب الطالب",
    subtitle: "طالب",
  };

  return (
    <>
      <SidebarPanel
        className="app-sidebar hidden md:flex"
        brand={brand}
        items={items}
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
          items={items}
          identity={identity}
          footer={footer}
          onNavigate={onMobileClose}
        />
      </div>
    </>
  );
}
