import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Activity, Building2, CalendarClock, GraduationCap, UserCog, Users, Wallet } from "@/components/icons";
import Spinner from "../components/common/Spinner";
import { platformService } from "../services/platformService";

const monthLabels = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function StatCard({ icon: Icon, label, value, accent = "text-primary" }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-muted">
        <Icon className={`h-6 w-6 ${accent}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-text-main">{value ?? 0}</p>
        <p className="truncate text-sm text-text-muted">{label}</p>
      </div>
    </div>
  );
}

export default function PlatformStatistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await platformService.getStatistics();
        setStats(response?.data ?? null);
      } catch {
        toast.error("تعذر تحميل إحصائيات المنصة");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-10">
        <Spinner msg="جارٍ تحميل الإحصائيات..." />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-text-main">إحصائيات المنصة</h1>

      <h2 className="mb-3 text-sm font-bold text-text-muted">المراكز</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard icon={Building2} label="إجمالي المراكز" value={stats?.totalCenters} />
        <StatCard icon={Building2} label="مراكز نشطة" value={stats?.activeCenters} accent="text-status-success" />
        <StatCard icon={Building2} label="مراكز موقوفة" value={stats?.suspendedCenters} accent="text-status-danger" />
        <StatCard icon={Activity} label="مراكز مدرّس فردي" value={stats?.soloTeacherCenters} accent="text-secondary" />
        <StatCard icon={Building2} label="مراكز متعددة المدرسين" value={stats?.multiTeacherCenters} />
        <StatCard icon={Building2} label="مواقع هذا الشهر" value={stats?.centersCreatedThisMonth} accent="text-primary" />
        <StatCard icon={Wallet} label="اشتراكات فعّالة" value={stats?.activeSubscriptions} accent="text-status-success" />
      </div>

      <h2 className="mb-3 text-sm font-bold text-text-muted">المستخدمون</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard icon={Users} label="إجمالي المستخدمين" value={stats?.totalUsers} />
        <StatCard icon={Building2} label="أصحاب المراكز" value={stats?.totalOwners} />
        <StatCard icon={UserCog} label="المدرسون" value={stats?.totalTeachers} />
        <StatCard icon={Users} label="المساعدون" value={stats?.totalAssistants} accent="text-secondary" />
        <StatCard icon={GraduationCap} label="الطلاب" value={stats?.totalStudents} accent="text-primary" />
      </div>

      <h2 className="mb-3 text-sm font-bold text-text-muted">المحتوى</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard icon={GraduationCap} label="إجمالي المجموعات" value={stats?.totalGroups} />
      </div>

      <h2 className="mb-3 text-sm font-bold text-text-muted">الاشتراكات</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard icon={CalendarClock} label="مراكز في فترة السماح" value={stats?.centersInGrace} accent="text-status-warning" />
        {(stats?.subscriptionsByType ?? []).map((item) => (
          <StatCard
            key={item.type}
            icon={Building2}
            label={`اشتراك ${item.label}`}
            value={item.count}
          />
        ))}
      </div>

      <h2 className="mb-3 text-sm font-bold text-text-muted">الإيرادات المسجّلة</h2>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard icon={Wallet} label="إيراد الشهر الحالي" value={Number(stats?.monthlyRevenue ?? 0).toLocaleString()} accent="text-status-success" />
      </div>
      <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm">
        <div className="flex h-40 items-end justify-between gap-2">
          {(stats?.revenueByMonth ?? []).map((item, index) => {
            const values = (stats?.revenueByMonth ?? []).map((m) => Number(m.revenue) || 0);
            const max = Math.max(1, ...values);
            const height = Math.round((Number(item.revenue) || 0) / max * 100);
            return (
              <div key={index} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-primary"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${Number(item.revenue).toLocaleString()}`}
                  />
                </div>
                <span className="text-[10px] text-text-muted">{monthLabels[index]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
