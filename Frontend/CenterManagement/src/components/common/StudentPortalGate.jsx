import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, Lock, Phone } from "@/components/icons";
import ScreenState from "@/components/ui/ScreenState";
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
    <ScreenState
      tone="warning"
      icon={Lock}
      eyebrow="بوابة الطالب"
      title="بوابة الطالب غير متاحة لهذا المركز"
      description="لم يتم تفعيل بوابة الطالب في اشتراك مركزك. تواصل مع الإدارة لتفعيلها."
      actions={[
        contactUrl && {
          label: "تواصل مع الإدارة",
          icon: Phone,
          href: contactUrl,
          external: true,
          testId: "student-portal-contact",
        },
        {
          label: "تسجيل خروج",
          icon: LogOut,
          onClick: handleLogout,
          variant: "danger",
          testId: "student-portal-logout",
        },
      ]}
      testId="student-portal-unavailable"
    />
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
