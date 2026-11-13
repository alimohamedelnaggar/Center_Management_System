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
      // ClaimTypes.Name is the xmlsoap 2005/05 URI, not the 2008/06 one.
      user?.[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
      ] ??
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
    <div
      role="status"
      data-testid="impersonation-banner"
      className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-status-warning/40 bg-status-warning-bg px-4 py-2.5 text-sm text-status-warning"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 start-0 w-1 bg-status-warning"
      />

      <div className="flex min-w-0 flex-1 items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-status-warning/15">
          <ShieldAlert aria-hidden="true" className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1 pt-1 leading-relaxed">
          أنت تتصفّح الآن كـ{" "}
          <b className="font-black text-text-main">{targetName}</b>
          {role ? ` (${role})` : ""} — تُسجَّل كل العمليات في سجل المراجعة.
          {impersonationWarning ? (
            <span className="mt-1 block font-bold text-status-danger">
              تنبيه: {impersonationWarning}
            </span>
          ) : null}
        </span>
      </div>

      <button
        type="button"
        onClick={handleStop}
        disabled={busy}
        data-testid="impersonation-stop"
        className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-full bg-text-main px-4 py-2 text-xs font-bold text-surface-card transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 sm:w-auto"
      >
        {busy ? "جارٍ الإنهاء..." : "إنهاء الانتحال"}
      </button>
    </div>
  );
}
