import { useEffect, useState } from "react";
import { ShieldAlert } from "@/components/icons";
import { useAuth } from "../context/useAuth";

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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 text-center shadow-2xl">
        <div className="mb-4 flex justify-center text-status-danger">
          <ShieldAlert size={48} />
        </div>
        <h2 className="mb-2 text-lg font-extrabold text-text-main">
          تم إيقاف الوصول
        </h2>
        <p className="mb-5 text-sm text-text-muted">{blocked.message}</p>
        <button
          onClick={() => {
            setBlocked(null);
            logout();
          }}
          className="w-full rounded-xl bg-primary py-2.5 font-bold text-white hover:bg-primary-hover"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
