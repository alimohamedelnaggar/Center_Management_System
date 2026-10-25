import { Loader2, UserCog } from "@/components/icons";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Pagination from "../common/Pagination";
import { teacherService } from "../../services/teacherService";

const PAGE_SIZE = 8;

export default function ReportsTeachersTab() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        const res = await teacherService.getPaginated(page, PAGE_SIZE);
        const list = res.data || res.data?.data || res.items || [];
        setTeachers(Array.isArray(list) ? list : []);
        setTotalPages(res.totalPages || 1);
        setTotal(res.totalCount || list.length);
      } catch (err) {
        toast.error("تعذر جلب تقرير المدرسين");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, [page]);

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card shadow-xs">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : teachers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-12 text-text-muted">
          <UserCog className="h-10 w-10" />
          <p className="text-sm font-semibold">لا يوجد مدرسون بعد</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-right text-xs">
            <thead className="border-b border-surface-border bg-surface-muted/80 font-bold text-text-muted">
              <tr>
                <th className="p-4 text-center">#</th>
                <th className="p-4">الاسم</th>
                <th className="p-4">الهاتف</th>
                <th className="p-4">المجموعات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-text-main">
              {teachers.map((teacher, index) => (
                <tr key={teacher.id} className="hover:bg-surface-muted/30">
                  <td className="p-4 text-center font-bold text-text-muted">
                    {(page - 1) * PAGE_SIZE + index + 1}
                  </td>
                  <td className="p-4 font-bold text-text-main">
                    {teacher.fullName}
                  </td>
                  <td className="p-4 font-medium text-text-muted" dir="ltr">
                    {teacher.phoneNumber || "-"}
                  </td>
                  <td className="p-4">
                    {teacher.groups && teacher.groups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {teacher.groups.map((group) => (
                          <span
                            key={group.id}
                            className="rounded-md border border-surface-border bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-main"
                          >
                            {group.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && teachers.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          name="مدرس"
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
