import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  PlayCircle,
  RefreshCw,
  Settings2,
} from "@/components/icons";
import RenewSubscriptionModal from "../components/common/RenewSubscriptionModal";
import SubscriptionEditModal from "../components/common/SubscriptionEditModal";
import { subscriptionService } from "../services/subscriptionService";

const stateStyles = {
  Active: "bg-status-success-bg text-status-success",
  InGrace: "bg-status-warning-bg text-status-warning",
  Expired: "bg-status-danger-bg text-status-danger",
  Suspended: "bg-surface-muted text-text-muted",
};

const stateLabels = {
  Active: "نشط",
  InGrace: "فترة سماح",
  Expired: "منتهي",
  Suspended: "موقوف",
};

const fieldClass =
  "min-h-11 w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
};

function ScrollHint({ label }) {
  return (
    <p className="no-print mb-2 text-xs font-medium text-text-muted sm:hidden">
      {label}
    </p>
  );
}

function LoadingState({ message }) {
  return (
    <div
      role="status"
      className="flex min-h-[16rem] flex-col items-center justify-center gap-3 p-6"
    >
      <span
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"
      />
      <p className="text-sm font-medium text-text-muted">{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      data-testid="subscriptions-error"
      className="flex min-h-[16rem] flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <AlertCircle className="h-10 w-10 text-status-danger" aria-hidden="true" />
      <p className="text-sm font-bold text-text-main">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        data-testid="subscriptions-retry"
        className={`${buttonClass} bg-primary px-5 text-primary-contrast hover:bg-primary-hover`}
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        إعادة المحاولة
      </button>
    </div>
  );
}

function StateBadge({ center }) {
  const extra =
    center.state === "InGrace" && center.daysLeftInGrace > 0
      ? ` (باقي ${center.daysLeftInGrace} يوم)`
      : "";
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-3 py-1 text-xs font-bold ${
        stateStyles[center.state] ?? "bg-surface-muted text-text-muted"
      }`}
    >
      {stateLabels[center.state] ?? center.state}
      {extra}
    </span>
  );
}

function SubscriptionActions({ center, onRenew, onEdit }) {
  const showRenew = center.state === "InGrace" || center.state === "Expired";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showRenew && (
        <button
          type="button"
          onClick={() => onRenew(center)}
          data-testid="subscription-renew"
          className={`${buttonClass} bg-primary px-3 text-primary-contrast hover:bg-primary-hover`}
        >
          <PlayCircle size={14} aria-hidden="true" /> تجديد
        </button>
      )}
      <button
        type="button"
        onClick={() => onEdit(center.id)}
        data-testid="subscription-edit"
        className="inline-flex min-h-11 items-center rounded-lg border border-surface-border bg-surface-card px-3 text-sm font-bold text-primary transition-colors hover:bg-primary-subtle"
      >
        <Settings2 size={14} aria-hidden="true" /> الاشتراك والوحدات
      </button>
      <span className="inline-flex min-h-11 items-center gap-1 text-xs text-text-muted">
        <CalendarClock size={12} aria-hidden="true" /> سماح {center.graceDays} يوم
      </span>
    </div>
  );
}

export default function SubscriptionsManagement() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editCenterId, setEditCenterId] = useState(null);
  const [renewCenter, setRenewCenter] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await subscriptionService.list(search.trim());
      if (response?.succeeded === false) {
        throw new Error(response?.message || "تعذر تحميل الاشتراكات");
      }
      const list = Array.isArray(response?.data)
        ? response.data
        : response?.data?.data ?? response?.data?.items ?? [];
      setRows(Array.isArray(list) ? list : []);
    } catch (caught) {
      const message = caught?.message || "تعذر تحميل الاشتراكات";
      // Inline retryable error only: a toast is redundant and can cover the
      // header actions on narrow tablet widths (see F-038).
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div
      data-testid="subscriptions-page"
      dir="rtl"
      className="mx-auto w-full min-w-0 max-w-7xl space-y-6 p-4 md:p-6"
    >
      <div className="no-print flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-main md:text-2xl">الاشتراكات</h1>
          <p className="mt-1 text-sm text-text-muted">
            إدارة اشتراكات المراكز والوحدات المفعّلة لكل مركز.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          data-testid="subscriptions-refresh"
          aria-label="تحديث الاشتراكات"
          className={`${buttonClass} border border-surface-border bg-surface-card text-text-muted hover:bg-surface-muted`}
        >
          <RefreshCw size={16} aria-hidden="true" /> تحديث
        </button>
      </div>

      <div className="no-print">
        <label className="sr-only" htmlFor="subscriptions-search-input">
          بحث بالاسم أو الهاتف
        </label>
        <input
          id="subscriptions-search-input"
          type="search"
          placeholder="بحث بالاسم أو الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="subscriptions-search"
          aria-label="بحث بالاسم أو الهاتف"
          className={`${fieldClass} max-w-sm`}
        />
      </div>

      {loading ? (
        <LoadingState message="جارٍ تحميل الاشتراكات..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <div
          data-testid="subscriptions-empty"
          className="rounded-card border border-surface-border bg-surface-card p-10 text-center text-sm text-text-muted"
        >
          لا توجد مراكز.
        </div>
      ) : (
        <>
          <ul data-testid="subscriptions-cards" className="space-y-3 md:hidden">
            {rows.map((center) => (
              <li
                key={center.id}
                data-testid="subscriptions-card"
                className={`min-w-0 rounded-card border border-surface-border bg-surface-card p-4 shadow-sm ${
                  center.expiringSoon ? "bg-status-warning-bg/40" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-bold text-text-main">
                      {center.name}
                    </p>
                    {center.expiringSoon && (
                      <p className="mt-1 text-xs font-bold text-status-warning">
                        قريب الانتهاء ({center.daysUntilExpiry} يوم)
                      </p>
                    )}
                  </div>
                  <StateBadge center={center} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-surface-muted p-3 text-sm">
                  <div className="min-w-0">
                    <dt className="text-xs text-text-muted">الخطة</dt>
                    <dd className="break-words font-bold text-text-main">
                      {center.plan || "—"}
                    </dd>
                    <dd className="break-words text-xs text-text-muted">{center.type}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-text-muted">الفترة</dt>
                    <dd className="break-all font-bold text-text-main" dir="ltr">
                      {formatDate(center.subscriptionStart)} → {formatDate(center.subscriptionEnd)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">الوحدات</dt>
                    <dd className="font-bold text-text-main">
                      {center.enabledModuleCount} / {center.totalModuleCount}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-text-muted">المدفوع / السعر</dt>
                    <dd className="break-all font-bold text-text-main" dir="ltr">
                      {Number(center.paidAmount ?? 0).toLocaleString()} /{" "}
                      {Number(center.price ?? 0).toLocaleString()} {center.currency || ""}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 border-t border-surface-border pt-3">
                  <SubscriptionActions
                    center={center}
                    onRenew={setRenewCenter}
                    onEdit={setEditCenterId}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <ScrollHint label="اسحب الجدول أفقيًا لرؤية بقية الأعمدة." />
            <div
              data-scroll-region
              tabIndex={0}
              role="region"
              aria-label="جدول الاشتراكات"
              className="overflow-x-auto rounded-card border border-surface-border bg-surface-card shadow-sm"
            >
              <table
                data-testid="subscriptions-table"
                className="w-full min-w-[1080px] text-right text-sm"
              >
                <thead className="bg-surface-muted text-text-muted">
                  <tr>
                    <th className="p-4 font-semibold">المركز</th>
                    <th className="p-4 font-semibold">الحالة</th>
                    <th className="p-4 font-semibold">الخطة</th>
                    <th className="p-4 font-semibold">الفترة</th>
                    <th className="p-4 font-semibold">الوحدات</th>
                    <th className="p-4 font-semibold">المدفوع / السعر</th>
                    <th className="p-4 font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {rows.map((center) => (
                    <tr
                      key={center.id}
                      data-testid="subscription-row"
                      className={`hover:bg-surface-muted/50 ${
                        center.expiringSoon ? "bg-status-warning-bg/40" : ""
                      }`}
                    >
                      <td className="p-4 font-bold text-text-main">
                        <span className="block break-words">{center.name}</span>
                        {center.expiringSoon && (
                          <span className="mt-1 inline-flex min-h-7 items-center rounded-full bg-status-warning-bg px-2 py-0.5 text-xs font-bold text-status-warning">
                            قريب الانتهاء ({center.daysUntilExpiry} يوم)
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <StateBadge center={center} />
                      </td>
                      <td className="p-4 text-text-muted">
                        <span className="block break-words">{center.plan || "—"}</span>
                        {center.type ? (
                          <span className="block break-words text-sm text-text-muted">
                            {center.type}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-4 text-sm text-text-muted" dir="ltr">
                        <div>{formatDate(center.subscriptionStart)}</div>
                        <div>→ {formatDate(center.subscriptionEnd)}</div>
                      </td>
                      <td className="p-4 text-text-muted">
                        {center.enabledModuleCount} / {center.totalModuleCount}
                      </td>
                      <td className="p-4 text-text-muted" dir="ltr">
                        {Number(center.paidAmount ?? 0).toLocaleString()} /{" "}
                        {Number(center.price ?? 0).toLocaleString()} {center.currency || ""}
                      </td>
                      <td className="p-4">
                        <SubscriptionActions
                          center={center}
                          onRenew={setRenewCenter}
                          onEdit={setEditCenterId}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <SubscriptionEditModal
        isOpen={editCenterId !== null}
        centerId={editCenterId}
        onClose={() => setEditCenterId(null)}
        onSaved={load}
      />

      <RenewSubscriptionModal
        isOpen={renewCenter !== null}
        center={renewCenter}
        onClose={() => setRenewCenter(null)}
        onRenewed={load}
      />
    </div>
  );
}
