import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, Lock, Phone } from "@/components/icons";
import { useAuth } from "../../context/useAuth";
import { platformContactWhatsApp } from "../../utils/whatsappContact";

/**
 * Full-screen page shown to a Student whose center has the `student_portal`
 * module turned off. It never leaves the student on a broken/empty page: it
 * explains the situation in Arabic and offers a way out (logout).
 */
export function StudentPortalUnavailable() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const contactUrl = platformContactWhatsApp();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-bg px-4 text-text-main">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-status-warning-bg text-status-warning">
          <Lock className="h-8 w-8" />
        </div>

        <h1 className="mb-2 text-xl font-bold text-text-main">
          بوابة الطالب غير متاحة لهذا المركز
        </h1>

        <p className="mb-6 text-sm text-text-muted">
          لم يتم تفعيل بوابة الطالب في اشتراك مركزك. تواصل مع الإدارة لتفعيلها.
        </p>

        {contactUrl && (
          <a
            href={contactUrl}
            target="_blank"
            rel="noreferrer"
            className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-text-inverse shadow-sm transition hover:opacity-90 active:scale-95"
          >
            <Phone className="h-5 w-5" />
            تواصل مع الإدارة
          </a>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-card px-5 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-600 active:scale-95"
        >
          <LogOut className="h-5 w-5" />
          تسجيل خروج
        </button>
      </div>
    </div>
  );
}

/**
 * Guards the whole student portal: when `student_portal` is disabled for the
 * center (login or first load of /student/*) it renders the Arabic
 * "بوابة الطالب غير متاحة" page with a logout button instead of the portal.
 * Fails open until the module list has loaded, so a refresh never flashes the
 * unavailable page.
 */
export default function StudentPortalGate() {
  const { hasCenterModule, modulesLoaded } = useAuth();

  if (!modulesLoaded) return <Outlet />;
  if (hasCenterModule("student_portal")) return <Outlet />;

  return <StudentPortalUnavailable />;
}
