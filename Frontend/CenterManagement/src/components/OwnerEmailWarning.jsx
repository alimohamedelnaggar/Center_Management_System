import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, X } from "@/components/icons";
import { useAuth } from "../context/useAuth";

/**
 * The reminder is hidden for two weeks after the owner dismisses it. The
 * timestamp lives in localStorage so a reload does not bring it back, and the
 * key is only written on an explicit dismiss.
 */
const DISMISS_KEY = "cm.ownerEmailWarning.dismissedAt";
const DISMISS_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function isDismissedRecently() {
  if (typeof window === "undefined" || !window.localStorage) return false;

  try {
    const timestamp = Number(window.localStorage.getItem(DISMISS_KEY));
    if (!Number.isFinite(timestamp) || timestamp <= 0) return false;
    return Date.now() - timestamp < DISMISS_WINDOW_MS;
  } catch {
    // Private mode / storage disabled: behave as if never dismissed.
    return false;
  }
}

function rememberDismissal() {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Nothing to do: the banner still hides for this session.
  }
}

/**
 * A quiet, dismissible reminder for the one account that can own the center but
 * has no recovery address: the owner (or a solo teacher). It is deliberately
 * non-blocking - the product still works without an email, it just cannot
 * recover itself - and it never shows to teachers, assistants or platform users,
 * nor while a platform admin is impersonating the owner.
 */
export default function OwnerEmailWarning() {
  const { role, isSoloTeacher, email, profileLoaded, impersonating } = useAuth();
  const [dismissed, setDismissed] = useState(isDismissedRecently);

  const dismiss = useCallback(() => {
    rememberDismissal();
    setDismissed(true);
  }, []);

  const isOwner = role === "CenterOwner" || isSoloTeacher === true;

  if (!isOwner || impersonating || !profileLoaded || dismissed) return null;
  if (email) return null;

  return (
    <div
      role="status"
      data-testid="owner-email-warning"
      className="relative flex flex-wrap items-center gap-2 border-b border-status-info/30 bg-status-info-bg px-4 py-2.5 text-sm text-status-info"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 start-0 w-1 bg-status-info"
      />

      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-status-info/15">
        <Mail aria-hidden="true" className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1 leading-relaxed">
        أضف بريدك لتتمكن من استعادة كلمة المرور.
      </span>

      <Link
        to="/profile"
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-status-info px-4 py-2 text-xs font-bold text-text-inverse transition-opacity duration-150 hover:opacity-90"
      >
        إضافة بريد إلكتروني
      </Link>

      <button
        type="button"
        aria-label="إغلاق التنبيه"
        onClick={dismiss}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-status-info/25 transition-colors duration-150 hover:bg-status-info/10"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
