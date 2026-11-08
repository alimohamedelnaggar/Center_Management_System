import {
  CalendarCheck,
  CalendarX,
  Clock,
  Percent,
  ShieldCheck,
} from "@/components/icons";
import { formatAttendanceRate } from "../../utils/attendance";

export default function AttendanceStatsCards({ stats, loading }) {
  const cards = [
    {
      title: "حضور اليوم",
      value: stats?.presentToday ?? 0,
      monthly: stats?.presentThisMonth ?? 0,
      icon: CalendarCheck,
      iconBg: "bg-status-success-bg",
      iconColor: "text-status-success",
    },
    {
      title: "غياب اليوم",
      value: stats?.absentToday ?? 0,
      monthly: stats?.absentThisMonth ?? 0,
      icon: CalendarX,
      iconBg: "bg-status-danger-bg",
      iconColor: "text-status-danger",
    },
    {
      title: "متأخر اليوم",
      value: stats?.lateToday ?? 0,
      monthly: stats?.lateThisMonth ?? 0,
      icon: Clock,
      iconBg: "bg-status-warning-bg",
      iconColor: "text-status-warning",
    },
    {
      title: "بعذر اليوم",
      value: stats?.excusedToday ?? 0,
      monthly: stats?.excusedThisMonth ?? 0,
      icon: ShieldCheck,
      iconBg: "bg-status-info-bg",
      iconColor: "text-status-info",
    },
    {
      title: "نسبة الحضور",
      value: formatAttendanceRate(stats?.attendanceRate),
      monthly: null,
      icon: Percent,
      iconBg: "bg-primary-subtle",
      iconColor: "text-primary",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-text-muted">{card.title}</p>

                {loading ? (
                  <div className="mt-3 h-8 w-16 animate-pulse rounded bg-surface-muted" />
                ) : (
                  <h2 className="mt-2 text-3xl font-bold text-text-main">
                    {card.value}
                  </h2>
                )}

                {!loading && card.monthly !== null && (
                  <p className="mt-1 text-[11px] text-text-muted">
                    هذا الشهر: {card.monthly}
                  </p>
                )}
              </div>

              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
              >
                <Icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
