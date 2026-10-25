import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Loader2, RefreshCw, UserRound, Users } from "@/components/icons";
import toast from "react-hot-toast";
import { parentPortalService } from "../../services/parentPortalService";

export default function ParentDashboardPage() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await parentPortalService.getChildren();
      if (res?.succeeded) {
        setChildren(res.data ?? []);
      } else {
        toast.error(res?.message || "تعذّر تحميل بيانات الأبناء");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "تعذّر تحميل بيانات الأبناء");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4 font-sans md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-main">أبنائي</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            الطلاب المرتبطون بحسابك في المركز
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-main transition hover:bg-surface-muted"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري التحميل...
        </div>
      )}

      {!loading && children.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-surface-border bg-surface-card py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle text-primary">
            <Users className="h-7 w-7" />
          </div>
          <p className="text-sm font-bold text-text-main">لا يوجد أبناء مرتبطون</p>
          <p className="max-w-sm text-xs text-text-muted">
            لم يتم ربط أي طالب بحسابك بعد. تواصل مع إدارة المركز لربط أبنائك.
          </p>
        </div>
      )}

      {!loading && children.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {children.map((child) => (
            <Link
              key={child.studentId}
              to={`/parent/children/${child.studentId}`}
              className="group flex items-center gap-3 rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm transition hover:border-primary hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-text-main">
                  {child.fullName}
                </p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    child.isActive
                      ? "bg-status-success-bg text-status-success"
                      : "bg-status-danger-bg text-status-danger"
                  }`}
                >
                  {child.isActive ? "نشط" : "غير نشط"}
                </span>
              </div>
              <ChevronLeft className="h-5 w-5 shrink-0 text-text-muted transition group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
