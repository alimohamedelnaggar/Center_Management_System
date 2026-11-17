import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  CalendarClock,
  GraduationCap,
  RefreshCw,
  UserCog,
  Users,
  Wallet,
} from "@/components/icons";
import { platformService } from "../services/platformService";

const monthLabels = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

function StatCard({ icon: Icon, label, value, accent = "text-primary" }) {
  return (
    <div
      data-testid="platform-stat"
      className="min-w-0 rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-muted"
        >
          <Icon className={`h-6 w-6 ${accent}`} />
        </div>
        <div className="min-w-0">
          <p className="break-words text-2xl font-extrabold tabular-nums text-text-main">
            {value ?? 0}
          </p>
          <p className="break-words text-sm text-text-muted">{label}</p>
        </div>
      </div>
    </div>
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
      data-testid="platform-error"
      className="flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-card border border-surface-border bg-surface-card p-6 text-center"
    >
      <AlertCircle className="h-10 w-10 text-status-danger" aria-hidden="true" />
      <p className="text-sm font-bold text-text-main">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        data-testid="platform-retry"
        className={`${buttonClass} bg-primary px-5 text-primary-contrast hover:bg-primary-hover`}
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        إعادة المحاولة
      </button>
    </div>
  );
}

function StatGroup({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold text-text-muted">{title}</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

export default function PlatformStatistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await platformService.getStatistics();
        if (response?.succeeded === false) {
          throw new Error(response?.message || "تعذر تحميل إحصائيات المنصة");
        }
        if (active) setStats(response?.data ?? null);
      } catch (caught) {
        const message = caught?.message || "تعذر تحميل إحصائيات المنصة";
        // Inline retryable error only; see F-038 (toast covered controls).
        if (active) {
          setError(message);
          setStats(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [retryKey]);

  if (loading) {
    return (
      <div data-testid="platform-page" dir="rtl" className="p-4 md:p-6">
        <LoadingState message="جارٍ تحميل الإحصائيات..." />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="platform-page" dir="rtl" className="p-4 md:p-6">
        <h1 className="mb-6 text-xl font-bold text-text-main md:text-2xl">
          إحصائيات المنصة
        </h1>
        <ErrorState message={error} onRetry={() => setRetryKey((key) => key + 1)} />
      </div>
    );
  }

  const revenue = stats?.revenueByMonth ?? [];
  const values = revenue.map((item) => Number(item.revenue) || 0);
  const maxRevenue = Math.max(1, ...values);

  return (
    <div
      data-testid="platform-page"
      dir="rtl"
      className="mx-auto w-full min-w-0 max-w-7xl space-y-6 p-4 md:p-6"
    >
      <h1 className="text-xl font-bold text-text-main md:text-2xl">
        إحصائيات المنصة
      </h1>

      <StatGroup title="المراكز">
        <StatCard icon={Building2} label="إجمالي المراكز" value={stats?.totalCenters} />
        <StatCard icon={Building2} label="مراكز نشطة" value={stats?.activeCenters} accent="text-status-success" />
        <StatCard icon={Building2} label="مراكز موقوفة" value={stats?.suspendedCenters} accent="text-status-danger" />
        <StatCard icon={Activity} label="مراكز مدرّس فردي" value={stats?.soloTeacherCenters} accent="text-secondary" />
        <StatCard icon={Building2} label="مراكز متعددة المدرسين" value={stats?.multiTeacherCenters} />
        <StatCard icon={Building2} label="مواقع هذا الشهر" value={stats?.centersCreatedThisMonth} accent="text-primary" />
        <StatCard icon={Wallet} label="اشتراكات فعّالة" value={stats?.activeSubscriptions} accent="text-status-success" />
      </StatGroup>

      <StatGroup title="المستخدمون">
        <StatCard icon={Users} label="إجمالي المستخدمين" value={stats?.totalUsers} />
        <StatCard icon={Building2} label="أصحاب المراكز" value={stats?.totalOwners} />
        <StatCard icon={UserCog} label="المدرسون" value={stats?.totalTeachers} />
        <StatCard icon={Users} label="المساعدون" value={stats?.totalAssistants} accent="text-secondary" />
        <StatCard icon={GraduationCap} label="الطلاب" value={stats?.totalStudents} accent="text-primary" />
      </StatGroup>

      <StatGroup title="المحتوى">
        <StatCard icon={GraduationCap} label="إجمالي المجموعات" value={stats?.totalGroups} />
      </StatGroup>

      <StatGroup title="الاشتراكات">
        <StatCard icon={CalendarClock} label="مراكز في فترة السماح" value={stats?.centersInGrace} accent="text-status-warning" />
        {(stats?.subscriptionsByType ?? []).map((item) => (
          <StatCard
            key={item.type}
            icon={Building2}
            label={`اشتراك ${item.label}`}
            value={item.count}
          />
        ))}
      </StatGroup>

      <section>
        <h2 className="mb-3 text-sm font-bold text-text-muted">الإيرادات المسجّلة</h2>
        <StatCard
          icon={Wallet}
          label="إيراد الشهر الحالي"
          value={Number(stats?.monthlyRevenue ?? 0).toLocaleString()}
          accent="text-status-success"
        />
        <p className="no-print mb-2 mt-4 text-xs font-medium text-text-muted sm:hidden">
          اسحب الرسم أفقيًا لرؤية بقية الأشهر.
        </p>
        <div
          data-scroll-region
          data-testid="platform-revenue-chart"
          tabIndex={0}
          role="region"
          aria-label="مخطط الإيرادات المسجلة حسب الشهر"
          className="mt-4 overflow-x-auto rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm"
        >
          <div
            role="img"
            aria-label="مخطط الإيرادات المسجلة حسب الشهر"
            className="flex h-40 min-w-[720px] items-end justify-between gap-2"
          >
            {revenue.map((item, index) => {
              const height = Math.round(
                ((Number(item.revenue) || 0) / maxRevenue) * 100,
              );
              return (
                <div key={item.month ?? index} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-primary"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${Number(item.revenue).toLocaleString()}`}
                    />
                  </div>
                  <span className="text-xs text-text-muted">
                    {monthLabels[index] ?? item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
