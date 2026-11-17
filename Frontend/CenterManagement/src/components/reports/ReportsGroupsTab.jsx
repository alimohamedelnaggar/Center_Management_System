import {
  AlertTriangle,
  LayoutGrid,
  Loader2,
  RefreshCw,
} from "@/components/icons";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Pagination from "../common/Pagination";
import { groupsService } from "../../services/groupsService";
import { formatCurrency } from "../../utils/formatCurrency";

const PAGE_SIZE = 8;

function num(group, key) {
  return Number(group[key] ?? 0);
}

export default function ReportsGroupsTab() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await groupsService.getAll(page, PAGE_SIZE);
      const list = res.items || res.data || res || [];
      setGroups(Array.isArray(list) ? list : []);
      setTotalPages(res.totalPages || res.pageCount || 1);
      setTotal(res.totalCount || res.totalItems || list.length);
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "تعذّر تحميل تقرير المجموعات",
      );
      toast.error("تعذر جلب تقرير المجموعات");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const totalStudents = groups.reduce(
    (sum, g) => sum + num(g, "totalStudentsCount"),
    0,
  );
  const expectedRevenue = groups.reduce(
    (sum, g) => sum + num(g, "totalStudentsCount") * num(g, "monthlyPrice"),
    0,
  );

  return (
    <div className="min-w-0 space-y-4" data-testid="reports-groups-page">
      {!loading && !error && groups.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm">
            <p className="text-sm font-semibold text-text-muted">
              إجمالي الطلاب في الصفحة
            </p>
            <p className="break-words text-xl font-bold tabular-nums text-text-main">
              {totalStudents}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm">
            <p className="text-sm font-semibold text-text-muted">
              الإيراد الشهري المتوقع (الصفحة)
            </p>
            <p className="break-words text-xl font-bold tabular-nums text-text-main">
              {formatCurrency(expectedRevenue)}
            </p>
          </div>
        </div>
      )}

      <div className="min-w-0 rounded-2xl border border-surface-border bg-surface-card shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div
            role="alert"
            data-testid="reports-groups-error"
            className="flex flex-col items-center gap-3 p-12 text-center"
          >
            <AlertTriangle className="h-10 w-10 text-status-danger" />
            <p className="text-sm font-bold text-text-main">
              تعذّر تحميل تقرير المجموعات
            </p>
            <p className="text-sm text-text-muted">{error}</p>
            <button
              type="button"
              onClick={fetchGroups}
              data-testid="reports-groups-retry"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              إعادة المحاولة
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-text-muted">
            <LayoutGrid className="h-10 w-10" aria-hidden="true" />
            <p className="text-sm font-semibold">لا توجد مجموعات بعد</p>
          </div>
        ) : (
          <>
            <p className="no-print px-4 pt-3 text-sm font-medium text-text-muted sm:hidden">
              اسحب الجدول أفقيًا لرؤية بقية الأعمدة.
            </p>
            <div
              className="overflow-x-auto"
              data-scroll-region
              tabIndex={0}
              role="region"
              aria-label="جدول تقرير المجموعات"
            >
              <table className="w-full min-w-[640px] text-right text-sm">
                <thead className="border-b border-surface-border bg-surface-muted/80 font-bold text-text-muted">
                  <tr>
                    <th className="p-4 text-center">#</th>
                    <th className="p-4">المجموعة</th>
                    <th className="p-4 text-center">عدد الطلاب</th>
                    <th className="p-4 text-center">جلسات/شهر</th>
                    <th className="p-4 text-center">السعر الشهري</th>
                    <th className="p-4 text-center">إيراد متوقع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-text-main">
                  {groups.map((group, index) => (
                    <tr key={group.id} className="hover:bg-surface-muted/30">
                      <td className="p-4 text-center font-bold tabular-nums text-text-muted">
                        {(page - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td className="p-4 font-bold text-text-main">
                        <span className="block min-w-0 break-words">
                          {group.name}
                        </span>
                      </td>
                      <td className="p-4 text-center font-semibold tabular-nums">
                        {num(group, "totalStudentsCount")}
                      </td>
                      <td className="p-4 text-center tabular-nums text-text-muted">
                        {num(group, "sessionsPerMonth")}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap tabular-nums text-text-muted">
                        {formatCurrency(num(group, "monthlyPrice"))}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap font-bold tabular-nums text-status-success">
                        {formatCurrency(
                          num(group, "totalStudentsCount") *
                            num(group, "monthlyPrice"),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && !error && groups.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            name="مجموعة"
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
