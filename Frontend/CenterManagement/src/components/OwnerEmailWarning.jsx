import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, X } from "@/components/icons";
import { useAuth } from "../context/useAuth";

/**
 * A quiet, dismissible reminder for the one account that can own the center but
 * has no recovery address: the owner (or a solo teacher). It is deliberately
 * non-blocking — the product still works without an email, it just cannot
 * recover itself — and it never shows to teachers, assistants or platform users.
 */
export default function OwnerEmailWarning() {
  const { role, isSoloTeacher, email, profileLoaded, impersonating } = useAuth();
  const [dismissed, setDismissed] = useState(false);

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
        onClick={() => setDismissed(true)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-status-info/25 transition-colors duration-150 hover:bg-status-info/10"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
