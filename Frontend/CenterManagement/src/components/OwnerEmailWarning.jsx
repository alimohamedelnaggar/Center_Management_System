import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Mail, X } from "@/components/icons";
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
      className="flex flex-wrap items-center gap-3 border-b border-status-info/30 bg-status-info-bg px-4 py-2.5 text-sm text-status-info"
    >
      <Mail className="h-5 w-5 shrink-0" />
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        أضف بريدك لتتمكن من استعادة كلمة المرور.
      </span>

      <Link
        to="/profile"
        className="rounded-lg bg-status-info px-3 py-1.5 text-xs font-semibold text-text-inverse transition-opacity hover:opacity-90"
      >
        إضافة بريد إلكتروني
      </Link>

      <button
        type="button"
        aria-label="إغلاق التنبيه"
        onClick={() => setDismissed(true)}
        className="rounded-lg p-1 transition-opacity hover:opacity-70"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
