import { CalendarClock, Lock, Phone } from "@/components/icons";
import Spinner from "../components/common/Spinner";
import PageHeader from "../components/ui/PageHeader";
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
  const enabledCount = MODULE_ORDER.filter((key) => enabled.has(key)).length;

  return (
    <div
      data-testid="subscription-page"
      dir="rtl"
      className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6"
    >
      <PageHeader
        title="اشتراكي"
        subtitle="تفاصيل خطتك وتواريخها والميزات المتاحة لحسابك."
      />

      {/* Plan hero */}
      <section className="overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 bg-primary-subtle/60 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-control bg-surface-card text-primary shadow-sm">
              <CalendarClock className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold text-text-muted">الخطة الحالية</p>
              <p className="text-2xl font-extrabold tracking-tight text-text-main">
                {typeLabel}
              </p>
            </div>
          </div>

          {stateInfo && (
            <span
              className={`inline-flex min-h-8 items-center rounded-full px-3 text-sm font-bold ${stateInfo.className}`}
            >
              {stateInfo.text}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
          <div className="rounded-control border border-surface-border bg-surface-muted px-4 py-3">
            <p className="text-xs text-text-muted">تاريخ البداية</p>
            <p className="mt-0.5 font-semibold text-text-main">
              {startText ?? "—"}
            </p>
          </div>
          <div className="rounded-control border border-surface-border bg-surface-muted px-4 py-3">
            <p className="text-xs text-text-muted">تاريخ الانتهاء</p>
            <p className="mt-0.5 font-semibold text-text-main">
              {endText ?? "—"}
            </p>
          </div>
          <div className="rounded-control border border-surface-border bg-surface-muted px-4 py-3">
            <p className="text-xs text-text-muted">الميزات المفعّلة</p>
            <p className="mt-0.5 font-semibold text-text-main">
              {enabledCount} من {MODULE_ORDER.length}
            </p>
          </div>
        </div>

        {state === "ingrace" && (
          <p
            role="status"
            className="mx-5 mb-5 rounded-control border border-status-warning/30 bg-status-warning-bg p-3 text-sm font-semibold text-status-warning"
          >
            أنت في فترة السماح — يتبقى {subscription?.daysLeftInGrace ?? 0} يوم قبل
            إيقاف الخدمة.
          </p>
        )}
      </section>

      {/* Enabled vs locked modules */}
      <section className="rounded-card border border-surface-border bg-surface-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-text-main">الميزات</h2>
          <p className="text-xs text-text-muted">
            الميزات غير المفعّلة تظهر مقفلة حتى ترقية الاشتراك.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULE_ORDER.map((key) => {
            const on = enabled.has(key);
            return (
              <div
                key={key}
                className={`flex items-center justify-between gap-2 rounded-control border px-4 py-3 text-sm ${
                  on
                    ? "border-surface-border bg-surface-muted text-text-main"
                    : "border-dashed border-surface-border bg-transparent text-text-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  {!on && (
                    <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  {MODULE_LABELS[key]}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    on ? "text-status-success" : "text-text-muted"
                  }`}
                >
                  {on ? "مُفعّلة" : "غير مُفعّلة"}
                </span>
              </div>
            );
          })}
        </div>

        {(upgradeUrl || contactUrl) && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-surface-border pt-4">
            {upgradeUrl && (
              <a
                href={upgradeUrl}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-action border border-primary bg-primary-subtle px-4 text-sm font-bold text-primary shadow-sm transition hover:bg-primary-light/20"
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
                رقّي سنترك إلى متعدد المدرسين
              </a>
            )}

            {contactUrl && (
              <a
                href={contactUrl}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-action bg-primary px-4 text-sm font-bold text-primary-contrast shadow-sm transition hover:bg-primary-hover"
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
                تواصل مع الإدارة للترقية
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
