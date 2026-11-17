import { useCallback, useEffect, useState } from "react";
import { AlertCircle, FileText, RefreshCw } from "@/components/icons";
import { auditLogService } from "../services/platformService";

const actionLabels = {
  OnboardCenter: "إنشاء مركز",
  Impersonate: "بدء انتحال",
  ImpersonationEnd: "إنهاء انتحال",
};

const formatAction = (action) => actionLabels[action] ?? action;

const fieldClass =
  "min-h-11 w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ar-EG");
  } catch {
    return value;
  }
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
      data-testid="audit-error"
      className="flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-card border border-surface-border bg-surface-card p-6 text-center"
    >
      <AlertCircle className="h-10 w-10 text-status-danger" aria-hidden="true" />
      <p className="text-sm font-bold text-text-main">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        data-testid="audit-retry"
        className={`${buttonClass} bg-primary px-5 text-primary-contrast hover:bg-primary-hover`}
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        إعادة المحاولة
      </button>
    </div>
  );
}

export default function AuditLogPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [meta, setMeta] = useState({ totalPages: 0, totalCount: 0 });
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await auditLogService.getPaginated({
        pageNumber: page,
        pageSize,
        search: search.trim() || undefined,
        action: action || undefined,
      });
      if (response?.succeeded === false) {
        throw new Error(response?.message || "تعذر تحميل سجل المراجعة");
      }
      const payload = response?.data;
      const list = Array.isArray(payload)
        ? payload
        : payload?.data ?? payload?.items ?? [];
      setRows(Array.isArray(list) ? list : []);
      setMeta({
        totalPages: payload?.totalPages ?? 0,
        totalCount: payload?.totalCount ?? 0,
      });
    } catch (caught) {
      const message = caught?.message || "تعذر تحميل سجل المراجعة";
      // Inline retryable error only; see F-038 (toast covered controls).
      setError(message);
      setRows([]);
      setMeta({ totalPages: 0, totalCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [page, search, action, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setRefreshKey((key) => key + 1);
  };

  const handleRefresh = () => setRefreshKey((key) => key + 1);

  return (
    <div
      data-testid="audit-page"
      dir="rtl"
      className="mx-auto w-full min-w-0 max-w-7xl space-y-6 p-4 md:p-6"
    >
      <div className="no-print flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-bold text-text-main md:text-2xl">سجل المراجعة</h1>
        <button
          type="button"
          onClick={handleRefresh}
          data-testid="audit-refresh"
          aria-label="تحديث سجل المراجعة"
          className={`${buttonClass} border border-surface-border bg-surface-card text-text-muted hover:bg-surface-muted`}
        >
          <RefreshCw size={16} aria-hidden="true" /> تحديث
        </button>
      </div>

      <form
        onSubmit={handleSearch}
        data-testid="audit-filters"
        className="no-print grid grid-cols-1 gap-3 rounded-card border border-surface-border bg-surface-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_14rem_auto]"
      >
        <div className="min-w-0">
          <label className="sr-only" htmlFor="audit-search-input">
            بحث في الأحداث
          </label>
          <input
            id="audit-search-input"
            type="search"
            placeholder="بحث في الأحداث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="audit-search"
            aria-label="بحث في الأحداث"
            className={fieldClass}
          />
        </div>
        <div className="min-w-0">
          <label className="sr-only" htmlFor="audit-action-select">
            كل الأحداث
          </label>
          <select
            id="audit-action-select"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            data-testid="audit-action"
            aria-label="تصفية حسب الحدث"
            className={fieldClass}
          >
            <option value="">كل الأحداث</option>
            <option value="OnboardCenter">إنشاء مركز</option>
            <option value="Impersonate">بدء انتحال</option>
            <option value="ImpersonationEnd">إنهاء انتحال</option>
          </select>
        </div>
        <button
          type="submit"
          data-testid="audit-submit"
          className={`${buttonClass} bg-primary px-5 text-primary-contrast hover:bg-primary-hover`}
        >
          بحث
        </button>
      </form>

      {loading ? (
        <LoadingState message="جارٍ تحميل السجل..." />
      ) : error ? (
        <ErrorState message={error} onRetry={handleRefresh} />
      ) : rows.length === 0 ? (
        <div
          data-testid="audit-empty"
          className="flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-card border border-surface-border bg-surface-card p-6 text-center text-text-muted"
        >
          <FileText size={40} aria-hidden="true" />
          <p className="text-sm font-semibold">لا توجد أحداث</p>
        </div>
      ) : (
        <>
          <ul data-testid="audit-cards" className="space-y-3 md:hidden">
            {rows.map((row) => (
              <li
                key={row.id}
                data-testid="audit-card"
                className="min-w-0 rounded-card border border-surface-border bg-surface-card p-4 shadow-sm"
              >
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <p className="min-w-0 break-words text-sm font-bold text-text-main">
                    {formatAction(row.action)}
                  </p>
                  <p className="min-w-0 break-words text-sm text-text-muted">
                    {formatDate(row.createdAt)}
                  </p>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
                  <div className="min-w-0">
                    <dt className="text-xs text-text-muted">المستخدم</dt>
                    <dd className="break-words font-bold text-text-main">
                      {row.actorName || "-"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-text-muted">التفاصيل</dt>
                    <dd className="break-words text-text-muted">{row.details || "-"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-text-muted">IP</dt>
                    <dd className="break-all text-text-muted" dir="ltr">
                      {row.ipAddress || "-"}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <ScrollHint label="اسحب الجدول أفقيًا لرؤية بقية الأعمدة." />
            <div
              data-scroll-region
              tabIndex={0}
              role="region"
              aria-label="جدول سجل المراجعة"
              className="overflow-x-auto rounded-card border border-surface-border bg-surface-card shadow-sm"
            >
              <table
                data-testid="audit-table"
                className="w-full min-w-[900px] text-right text-sm"
              >
                <thead className="bg-surface-muted text-text-muted">
                  <tr>
                    <th className="p-4 font-semibold">التاريخ</th>
                    <th className="p-4 font-semibold">المستخدم</th>
                    <th className="p-4 font-semibold">الحدث</th>
                    <th className="p-4 font-semibold">التفاصيل</th>
                    <th className="p-4 font-semibold">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      data-testid="audit-row"
                      className="hover:bg-surface-muted/50"
                    >
                      <td className="whitespace-nowrap p-4 text-text-muted">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="p-4 text-text-main">
                        <span className="block break-words">{row.actorName || "-"}</span>
                      </td>
                      <td className="whitespace-nowrap p-4 font-semibold text-text-main">
                        {formatAction(row.action)}
                      </td>
                      <td className="p-4 text-text-muted">
                        <span className="block break-words">{row.details || "-"}</span>
                      </td>
                      <td className="p-4 text-text-muted" dir="ltr">
                        {row.ipAddress || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {meta.totalPages > 1 && (
            <div
              data-testid="audit-pagination"
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-surface-border bg-surface-card p-4 text-sm text-text-muted"
            >
              <span>
                صفحة {page} من {meta.totalPages} — إجمالي {meta.totalCount}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`${buttonClass} border border-surface-border bg-surface-card text-text-main hover:bg-surface-muted`}
                >
                  السابق
                </button>
                <button
                  type="button"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className={`${buttonClass} border border-surface-border bg-surface-card text-text-main hover:bg-surface-muted`}
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
