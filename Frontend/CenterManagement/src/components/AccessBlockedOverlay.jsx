import { useEffect, useState } from "react";
import { LogOut, ShieldAlert } from "@/components/icons";
import ScreenState from "@/components/ui/ScreenState";
import { useAuth } from "../context/useAuth";

/**
 * Full-screen sheet raised by `axios` when the API rejects a request with a
 * center/account lifecycle code (suspended, expired, deleted…). It has one job:
 * explain why the session is unusable and sign the user out.
 */
export default function AccessBlockedOverlay() {
  const { logout } = useAuth();
  const [blocked, setBlocked] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      setBlocked(event.detail ?? { message: "تم تعطيل الوصول." });
    };
    window.addEventListener("access:blocked", handler);
    return () => window.removeEventListener("access:blocked", handler);
  }, []);

  if (!blocked) return null;

  return (
    <ScreenState
      surface="overlay"
      tone="danger"
      role="alertdialog"
      icon={ShieldAlert}
      eyebrow="انتهى الوصول"
      title="تم إيقاف الوصول"
      description={blocked.message}
      actions={[
        {
          label: "تسجيل الخروج",
          icon: LogOut,
          variant: "danger",
          testId: "access-blocked-logout",
          onClick: () => {
            setBlocked(null);
            logout();
          },
        },
      ]}
      testId="access-blocked"
    />
  );
}
