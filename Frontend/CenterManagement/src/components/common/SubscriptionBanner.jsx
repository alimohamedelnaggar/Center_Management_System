import { CalendarClock, Phone } from "@/components/icons";
import { useAuth } from "../../context/useAuth";
import { platformContactWhatsApp } from "../../utils/whatsappContact";

function daysUntil(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - today) / 86400000);
}

/**
 * Billing banner, shown ONLY to the center owner / solo teacher:
 * - a 14-day pre-expiry warning,
 * - a persistent banner during the grace window (with the days left).
 * Regular teachers/assistants/students never receive a subscription snapshot.
 */
export default function SubscriptionBanner() {
  const { subscription, isCenterOwner, isSoloTeacher, impersonating } = useAuth();

  if (!subscription) return null;
  // Impersonation shows exactly what the center sees, so it is allowed here.
  if (!isCenterOwner && !isSoloTeacher && !impersonating) return null;

  const state = String(subscription.state || "").toLowerCase();
  const contactUrl = platformContactWhatsApp();

  if (state === "ingrace") {
    const days = Number(subscription.daysLeftInGrace ?? 0);
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-status-warning/30 bg-status-warning-bg px-4 py-2.5 text-sm text-status-warning">
        <span className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 shrink-0" />
          انتهى اشتراكك وأنت في فترة السماح — يتبقى {days} يوم قبل الإيقاف.
        </span>
        {contactUrl && (
          <a
            href={contactUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-status-warning px-3 py-1.5 text-xs font-medium text-text-inverse"
          >
            <Phone className="h-4 w-4" />
            تجديد الاشتراك
          </a>
        )}
      </div>
    );
  }

  if (state === "active") {
    const left =
      typeof subscription.daysUntilEnd === "number"
        ? subscription.daysUntilEnd
        : daysUntil(subscription.endDate);

    // Lifetime (no end date) or comfortably far from expiry: no banner.
    if (left === null || left > 14) return null;

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-status-warning/30 bg-status-warning-bg px-4 py-2.5 text-sm text-status-warning">
        <span className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 shrink-0" />
          {left <= 0
            ? "اشتراكك ينتهي اليوم."
            : `اشتراكك ينتهي خلال ${left} يوم.`}
        </span>
        {contactUrl && (
          <a
            href={contactUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-status-warning px-3 py-1.5 text-xs font-medium text-text-inverse"
          >
            <Phone className="h-4 w-4" />
            تجديد الاشتراك
          </a>
        )}
      </div>
    );
  }

  // Expired / Suspended keep the existing blocked screen; no inline banner.
  return null;
}
