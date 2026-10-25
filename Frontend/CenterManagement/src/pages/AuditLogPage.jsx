import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FileText, RefreshCw } from "@/components/icons";
import Spinner from "../components/common/Spinner";
import { auditLogService } from "../services/platformService";

const actionLabels = {
  OnboardCenter: "إنشاء مركز",
  Impersonate: "بدء انتحال",
  ImpersonationEnd: "إنهاء انتحال",
};

const formatAction = (action) => actionLabels[action] ?? action;

const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ar-EG");
  } catch {
    return value;
  }
};

export default function AuditLogPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 0, totalCount: 0 });
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await auditLogService.getPaginated({
        pageNumber: page,
        pageSize,
        search: search.trim() || undefined,
        action: action || undefined,
      });
      const data = response?.data;
      setRows(data?.data ?? []);
      setMeta({
        totalPages: data?.totalPages ?? 0,
        totalCount: data?.totalCount ?? 0,
      });
    } catch {
      toast.error("تعذر تحميل سجل المراجعة");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, action]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text-main">سجل المراجعة</h1>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-text-muted hover:bg-surface-muted"
        >
          <RefreshCw size={16} /> تحديث
        </button>
      </div>

      <form
        onSubmit={handleSearch}
        className="mb-4 flex flex-wrap items-center gap-3"
      >
        <input
          type="text"
          placeholder="بحث في الأحداث..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[220px] flex-1 rounded-xl border border-surface-border bg-surface-muted p-2.5 text-text-main focus:border-primary focus:outline-none"
        />
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-surface-border bg-surface-muted p-2.5 text-text-main focus:border-primary focus:outline-none"
        >
          <option value="">كل الأحداث</option>
          <option value="OnboardCenter">إنشاء مركز</option>
          <option value="Impersonate">بدء انتحال</option>
          <option value="ImpersonationEnd">إنهاء انتحال</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-primary px-5 py-2.5 font-bold text-white hover:bg-primary-hover"
        >
          بحث
        </button>
      </form>

      <div className="rounded-lg border border-surface-border bg-surface-card shadow">
        {loading ? (
          <div className="p-10">
            <Spinner msg="جارٍ تحميل السجل..." />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-text-muted">
            <FileText size={40} />
            <p>لا توجد أحداث</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-muted text-sm text-text-muted">
                <tr>
                  <th className="p-4 font-medium">التاريخ</th>
                  <th className="p-4 font-medium">المستخدم</th>
                  <th className="p-4 font-medium">الحدث</th>
                  <th className="p-4 font-medium">التفاصيل</th>
                  <th className="p-4 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-surface-border hover:bg-surface-muted/50"
                  >
                    <td className="whitespace-nowrap p-4 text-text-muted">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="p-4 text-text-main">
                      {row.actorName || "-"}
                    </td>
                    <td className="whitespace-nowrap p-4 font-semibold text-text-main">
                      {formatAction(row.action)}
                    </td>
                    <td className="p-4 text-text-muted">{row.details || "-"}</td>
                    <td className="p-4 text-text-muted" dir="ltr">
                      {row.ipAddress || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
          <span>
            صفحة {page} من {meta.totalPages} — إجمالي {meta.totalCount}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-surface-muted disabled:opacity-50"
            >
              السابق
            </button>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-surface-muted disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
