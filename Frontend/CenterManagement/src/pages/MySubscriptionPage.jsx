import { CalendarClock, Lock, Phone } from "@/components/icons";
import Spinner from "../components/common/Spinner";
import { useAuth } from "../context/useAuth";
import { MODULE_LABELS, MODULES } from "../constants/modules";
import { platformContactWhatsApp } from "../utils/whatsappContact";

const TYPE_LABELS = {
  Monthly: "شهري",
  Quarterly: "ربع سنوي",
  SemiAnnual: "نصف سنوي",
  Annual: "سنوي",
  Lifetime: "مدى الحياة",
};

const STATE_LABELS = {
  active: { text: "نشط", className: "bg-status-success-bg text-status-success" },
  ingrace: { text: "فترة سماح", className: "bg-status-warning-bg text-status-warning" },
  expired: { text: "منتهي", className: "bg-status-danger-bg text-status-danger" },
  suspended: { text: "موقوف", className: "bg-status-danger-bg text-status-danger" },
};

// Order the module cards the same way the catalog groups them.
const MODULE_ORDER = Object.values(MODULES);

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * "اشتراكي" — plan, dates, state, and enabled vs locked modules.
 * Center owner / solo teacher only.
 */
export default function MySubscriptionPage() {
  const { subscription, enabledModules, modulesLoaded, isSoloCenter } = useAuth();

  if (!modulesLoaded) return <Spinner msg="جاري تحميل بيانات الاشتراك" />;

  const contactUrl = platformContactWhatsApp();
  // A solo center can ask support to be upgraded to a multi-teacher center.
  const upgradeUrl = isSoloCenter
    ? platformContactWhatsApp("مرحبًا، أريد ترقية سنتري إلى متعدد المدرسين.")
    : null;
  const state = String(subscription?.state || "").toLowerCase();
  const stateInfo = STATE_LABELS[state] ?? null;
  const isLifetime = !subscription?.endDate;
  const typeLabel = TYPE_LABELS[subscription?.type] ?? subscription?.type ?? "—";

  const enabled = new Set(
    (enabledModules || []).map((k) => String(k).toLowerCase()),
  );

  const startText = formatDate(subscription?.startDate);
  const endText = isLifetime ? "مدى الحياة" : formatDate(subscription?.endDate);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-subtle text-primary">
          <CalendarClock className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-text-main">اشتراكي</h1>
      </div>

      {/* Plan + dates */}
      <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-text-muted">نوع الخطة</p>
            <p className="text-lg font-bold text-text-main">{typeLabel}</p>
          </div>
          {stateInfo && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stateInfo.className}`}>
              {stateInfo.text}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-surface-muted px-4 py-3">
            <p className="text-xs text-text-muted">تاريخ البداية</p>
            <p className="font-semibold text-text-main">{startText ?? "—"}</p>
          </div>
          <div className="rounded-xl bg-surface-muted px-4 py-3">
            <p className="text-xs text-text-muted">تاريخ الانتهاء</p>
            <p className="font-semibold text-text-main">{endText ?? "—"}</p>
          </div>
        </div>

        {state === "ingrace" && (
          <p className="mt-4 text-sm text-status-warning">
            أنت في فترة السماح — يتبقى {subscription?.daysLeftInGrace ?? 0} يوم قبل إيقاف الخدمة.
          </p>
        )}
      </div>

      {/* Enabled vs locked modules */}
      <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-text-main">الميزات</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULE_ORDER.map((key) => {
            const on = enabled.has(key);
            return (
              <div
                key={key}
                className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${
                  on
                    ? "border-surface-border bg-surface-muted text-text-main"
                    : "border-dashed border-surface-border bg-transparent text-text-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  {!on && <Lock className="h-4 w-4 shrink-0" />}
                  {MODULE_LABELS[key]}
                </span>
                <span
                  className={`text-xs font-semibold ${on ? "text-status-success" : "text-text-muted"}`}
                >
                  {on ? "مُفعّلة" : "غير مُفعّلة"}
                </span>
              </div>
            );
          })}
        </div>

        {upgradeUrl && (
          <a
            href={upgradeUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-primary bg-primary-subtle px-4 py-2.5 text-sm font-medium text-primary shadow-sm transition hover:opacity-90 active:scale-95"
          >
            <Phone className="h-5 w-5" />
            رقّي سنترك إلى متعدد المدرسين
          </a>
        )}

        {contactUrl && (
          <a
            href={contactUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 ms-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse shadow-sm transition hover:opacity-90 active:scale-95"
          >
            <Phone className="h-5 w-5" />
            تواصل مع الإدارة للترقية
          </a>
        )}
      </div>
    </div>
  );
}
