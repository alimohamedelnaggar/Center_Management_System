import { LayoutGrid, Loader2 } from "@/components/icons";
import { useEffect, useState } from "react";
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const res = await groupsService.getAll(page, PAGE_SIZE);
        const list = res.items || res.data || res || [];
        setGroups(Array.isArray(list) ? list : []);
        setTotalPages(res.totalPages || res.pageCount || 1);
        setTotal(res.totalCount || res.totalItems || list.length);
      } catch (err) {
        toast.error("تعذر جلب تقرير المجموعات");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, [page]);

  const totalStudents = groups.reduce(
    (sum, g) => sum + num(g, "totalStudentsCount"),
    0,
  );
  const expectedRevenue = groups.reduce(
    (sum, g) => sum + num(g, "totalStudentsCount") * num(g, "monthlyPrice"),
    0,
  );

  return (
    <div className="space-y-4">
      {!loading && groups.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm">
            <p className="text-xs font-semibold text-text-muted">
              إجمالي الطلاب في الصفحة
            </p>
            <p className="text-xl font-bold text-text-main">{totalStudents}</p>
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm">
            <p className="text-xs font-semibold text-text-muted">
              الإيراد الشهري المتوقع (الصفحة)
            </p>
            <p className="text-xl font-bold text-text-main">
              {formatCurrency(expectedRevenue)}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-surface-border bg-surface-card shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-text-muted">
            <LayoutGrid className="h-10 w-10" />
            <p className="text-sm font-semibold">لا توجد مجموعات بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-right text-xs">
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
                    <td className="p-4 text-center font-bold text-text-muted">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="p-4 font-bold text-text-main">
                      {group.name}
                    </td>
                    <td className="p-4 text-center font-semibold">
                      {num(group, "totalStudentsCount")}
                    </td>
                    <td className="p-4 text-center text-text-muted">
                      {num(group, "sessionsPerMonth")}
                    </td>
                    <td className="p-4 text-center text-text-muted">
                      {formatCurrency(num(group, "monthlyPrice"))}
                    </td>
                    <td className="p-4 text-center font-bold text-status-success">
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
        )}

        {!loading && groups.length > 0 && (
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
