import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "@/components/icons";
import { useAuth } from "../context/useAuth";
import { homeFor } from "../utils/homeRoute";

export default function ImpersonationBanner() {
  const { impersonating, user, role, stopImpersonation, impersonationWarning } =
    useAuth();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const targetName = useMemo(
    () =>
      user?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/name"] ??
      user?.name ??
      "مستخدم",
    [user],
  );

  if (!impersonating) return null;

  const handleStop = async () => {
    setBusy(true);
    try {
      await stopImpersonation();
      navigate(homeFor("SuperAdmin"), { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-sm text-amber-900">
      <div className="flex items-center gap-2 font-semibold">
        <ShieldAlert className="h-5 w-5 shrink-0" />
        <span>
          أنت تتصفّح الآن كـ <b>{targetName}</b>
          {role ? ` (${role})` : ""} — تُسجَّل كل العمليات في سجل المراجعة.
          {impersonationWarning ? (
            <span className="mt-0.5 block font-bold text-status-danger">
              تنبيه: {impersonationWarning}
            </span>
          ) : null}
        </span>
      </div>
      <button
        type="button"
        onClick={handleStop}
        disabled={busy}
        className="rounded-lg bg-amber-900 px-4 py-1.5 font-bold text-white transition hover:bg-amber-800 disabled:opacity-60"
      >
        {busy ? "جارٍ الإنهاء..." : "إنهاء الانتحال"}
      </button>
    </div>
  );
}
