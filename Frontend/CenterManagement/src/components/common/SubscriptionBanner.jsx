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

const BANNER =
  "relative flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-status-warning/30 bg-status-warning-bg px-4 py-2.5 text-sm text-status-warning";

function RenewLink({ contactUrl }) {
  if (!contactUrl) return null;

  return (
    <a
      href={contactUrl}
      target="_blank"
      rel="noreferrer"
      data-testid="subscription-renew"
      className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-status-warning px-4 py-2 text-xs font-bold text-text-inverse transition-all duration-150 hover:opacity-90 active:scale-[0.98] sm:w-auto"
    >
      <Phone aria-hidden="true" className="h-4 w-4" />
      تجديد الاشتراك
    </a>
  );
}

/**
 * Billing banner, shown ONLY to the center owner / solo teacher:
 * - a 14-day pre-expiry warning,
 * - a persistent banner during the grace window (with the days left).
 * Regular teachers/assistants/students never receive a subscription snapshot.
 */
export default function SubscriptionBanner() {
  // NOTE: the auth context exposes `role`, not an `isCenterOwner` flag. Reading
  // the flag here silently hid the banner from every real owner.
  const { subscription, role, isSoloTeacher, impersonating } = useAuth();
  const isCenterOwner = role === "CenterOwner";

  if (!subscription) return null;
  // Impersonation shows exactly what the center sees, so it is allowed here.
  if (!isCenterOwner && !isSoloTeacher && !impersonating) return null;

  const state = String(subscription.state || "").toLowerCase();
  const contactUrl = platformContactWhatsApp();

  if (state === "ingrace") {
    const days = Number(subscription.daysLeftInGrace ?? 0);
    return (
      <div
        role="status"
        data-testid="subscription-banner"
        data-variant="grace"
        className={BANNER}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 start-0 w-1 bg-status-warning"
        />
        <span className="flex min-w-0 flex-1 items-start gap-2">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-status-warning/15">
            <CalendarClock aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 pt-1 leading-relaxed">
            انتهى اشتراكك وأنت في فترة السماح — يتبقى {days} يوم قبل الإيقاف.
          </span>
        </span>
        <RenewLink contactUrl={contactUrl} />
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
      <div
        role="status"
        data-testid="subscription-banner"
        data-variant="expiring"
        className={BANNER}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 start-0 w-1 bg-status-warning"
        />
        <span className="flex min-w-0 flex-1 items-start gap-2">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-status-warning/15">
            <CalendarClock aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 pt-1 leading-relaxed">
            {left <= 0
              ? "اشتراكك ينتهي اليوم."
              : `اشتراكك ينتهي خلال ${left} يوم.`}
          </span>
        </span>
        <RenewLink contactUrl={contactUrl} />
      </div>
    );
  }

  // Expired / Suspended keep the existing blocked screen; no inline banner.
  return null;
}
