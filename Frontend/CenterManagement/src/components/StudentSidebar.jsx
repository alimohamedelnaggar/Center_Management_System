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
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const navItems = [
  { title: "لوحة التحكم", path: "/student/dashboard", icon: LayoutDashboard, module: "core" },
  { title: "امتحاناتي", path: "/student/exams", icon: ClipboardList, module: "online_exams" },
  { title: "النتائج", path: "/student/results", icon: Star, module: "grades" },
  { title: "المذكرات", path: "/student/notes", icon: NotebookText, module: "study_notes" },
  { title: "الحضور والغياب", path: "/student/attendance", icon: CalendarCheck, module: "attendance" },
  { title: "المدفوعات", path: "/student/payments", icon: Wallet, module: "payments" },
  { title: "الإشعارات", path: "/student/notifications", icon: Bell, module: "core" },
  { title: "الملف الشخصي", path: "/student/profile", icon: UserRound, module: "core" },
];

export default function StudentSidebar() {
  const navigate = useNavigate();
  const { logout, hasCenterModule } = useAuth();
  const visibleItems = navItems.filter((item) => hasCenterModule(item.module));

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold text-text-inverse shadow-sm">
            Edu
          </div>
          <h2 className="hidden text-lg font-bold text-text-main md:block">
            بوابة الطالب
          </h2>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-2 pb-4 md:px-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={linkClass}
                title={item.title}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="hidden truncate md:inline">{item.title}</span>
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
            <p className="truncate font-semibold text-text-main">حساب الطالب</p>
            <p className="truncate text-text-muted">طالب</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="تسجيل خروج"
          className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-medium text-red-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600 active:scale-95 md:px-4"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="hidden whitespace-nowrap md:inline">تسجيل خروج</span>
        </button>
      </div>
    </aside>
  );
}
