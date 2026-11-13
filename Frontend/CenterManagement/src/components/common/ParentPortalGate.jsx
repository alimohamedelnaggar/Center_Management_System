import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, Lock, Phone } from "@/components/icons";
import ScreenState from "@/components/ui/ScreenState";
import { useAuth } from "../../context/useAuth";
import { platformContactWhatsApp } from "../../utils/whatsappContact";

/**
 * Full-screen page shown to a Parent whose center has the `parent_portal`
 * module turned off. Mirrors StudentPortalUnavailable so the parent never
 * lands on a broken/empty page.
 */
export function ParentPortalUnavailable() {
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
      eyebrow="بوابة ولي الأمر"
      title="بوابة ولي الأمر غير متاحة لهذا المركز"
      description="لم يتم تفعيل بوابة ولي الأمر في اشتراك مركزك. تواصل مع الإدارة لتفعيلها."
      actions={[
        contactUrl && {
          label: "تواصل مع الإدارة",
          icon: Phone,
          href: contactUrl,
          external: true,
          testId: "parent-portal-contact",
        },
        {
          label: "تسجيل خروج",
          icon: LogOut,
          onClick: handleLogout,
          variant: "danger",
          testId: "parent-portal-logout",
        },
      ]}
      testId="parent-portal-unavailable"
    />
  );
}

/**
 * Guards the whole parent portal: when `parent_portal` is disabled for the
 * center it renders the Arabic "بوابة ولي الأمر غير متاحة" page instead of the
 * portal. Fails open until the module list has loaded.
 */
export default function ParentPortalGate() {
  const { hasCenterModule, modulesLoaded } = useAuth();

  if (!modulesLoaded) return <Outlet />;
  if (hasCenterModule("parent_portal")) return <Outlet />;

  return <ParentPortalUnavailable />;
}
