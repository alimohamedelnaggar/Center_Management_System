import { Lock, Phone } from "@/components/icons";
import { MODULE_LABELS } from "../../constants/modules";
import { platformContactWhatsApp } from "../../utils/whatsappContact";

/**
 * Shown when a module is disabled for the center (direct URL, or a module
 * toggled off while the user is logged in). Never blank, never a generic error.
 */
export default function ModuleLocked({ moduleKey }) {
  const contactUrl = platformContactWhatsApp();
  const label = MODULE_LABELS[moduleKey];

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-status-warning-bg text-status-warning">
          <Lock className="h-8 w-8" />
        </div>

        <h2 className="mb-2 text-xl font-bold text-text-main">
          غير مشترك في هذه الوحدة
        </h2>

        {label && (
          <p className="mb-1 text-sm text-text-muted">
            الوحدة: <span className="font-semibold text-text-main">{label}</span>
          </p>
        )}

        <p className="mb-6 text-sm text-text-muted">
          هذه الميزة غير مفعّلة في اشتراك مركزك. للتفعيل، تواصل مع إدارة المنصة.
        </p>

        {contactUrl ? (
          <a
            href={contactUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-text-inverse shadow-sm transition hover:opacity-90 active:scale-95"
          >
            <Phone className="h-5 w-5" />
            تواصل مع الإدارة
          </a>
        ) : (
          <p className="text-xs text-text-muted">
            رقم التواصل غير مُهيّأ. تواصل مع إدارة المنصة.
          </p>
        )}
      </div>
    </div>
  );
}
