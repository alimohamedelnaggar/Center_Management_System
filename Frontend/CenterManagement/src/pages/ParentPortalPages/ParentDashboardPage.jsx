import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Loader2,
  RefreshCw,
  UserRound,
  Users,
} from "@/components/icons";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import {
  PortalEmpty,
  PortalLoading,
  PortalStatus,
} from "../../components/portal/PortalUI";
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
    <div data-testid="parent-dashboard-page" className="p-4 font-sans md:p-6">
      <PageHeader
        className="mb-5"
        title="أبنائي"
        subtitle="الطلاب المرتبطون بحسابك في المركز"
        actions={
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        }
      />

      {loading && <PortalLoading icon={Loader2} />}

      {!loading && children.length === 0 && (
        <PortalEmpty
          icon={Users}
          title="لا يوجد أبناء مرتبطون"
          description="لم يتم ربط أي طالب بحسابك بعد. تواصل مع إدارة المركز لربط أبنائك."
        />
      )}

      {!loading && children.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {children.map((child) => (
            <Link
              key={child.studentId}
              to={`/parent/children/${child.studentId}`}
              data-testid="parent-child-card"
              className="group flex min-h-20 items-center gap-3 rounded-card border border-surface-border bg-surface-card p-4 shadow-soft transition hover:border-primary hover:shadow-md"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                <UserRound className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-lg font-extrabold leading-7 text-text-main">
                  {child.fullName}
                </p>
                <PortalStatus
                  tone={child.isActive ? "success" : "danger"}
                  className="mt-1"
                >
                  {child.isActive ? "نشط" : "غير نشط"}
                </PortalStatus>
              </div>
              <ChevronLeft
                className="h-6 w-6 shrink-0 text-text-muted transition group-hover:text-primary"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
