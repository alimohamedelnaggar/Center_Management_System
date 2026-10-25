import {
  CalendarCheck,
  CalendarX,
  GraduationCap,
  LayoutGrid,
  Loader2,
  ReceiptText,
  TrendingUp,
  UserCheck,
  UserCog,
  UserMinus,
  UserRound,
  Users,
  Wallet,
} from "@/components/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { reportsService } from "../../services/reportsService";
import { formatCurrency } from "../../utils/formatCurrency";

const MONTHS = [
  { value: 1, label: "يناير" },
  { value: 2, label: "فبراير" },
  { value: 3, label: "مارس" },
  { value: 4, label: "أبريل" },
  { value: 5, label: "مايو" },
  { value: 6, label: "يونيو" },
  { value: 7, label: "يوليو" },
  { value: 8, label: "أغسطس" },
  { value: 9, label: "سبتمبر" },
  { value: 10, label: "أكتوبر" },
  { value: 11, label: "نوفمبر" },
  { value: 12, label: "ديسمبر" },
];

function StatCard({ title, value, icon: Icon, iconClass }) {
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm md:p-5">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-text-muted">{title}</p>
        <p className="truncate text-xl font-bold text-text-main">{value}</p>
      </div>
    </div>
  );
}

export default function ReportsOverviewTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const result = [];
    for (let y = current + 1; y >= 2022; y -= 1) result.push(y);
    return result;
  }, []);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reportsService.getOverview({ year, month });
      setData(res);
    } catch (err) {
      toast.error("تعذر جلب ملخص التقارير");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const has = (v) => v !== null && v !== undefined;

  const cards = data
    ? [
        has(data.studentsCount) && {
          title: "إجمالي الطلاب",
          value: data.studentsCount,
          icon: Users,
          iconClass: "bg-primary-subtle text-primary",
        },
        has(data.activeStudentsCount) && {
          title: "الطلاب النشطون",
          value: data.activeStudentsCount,
          icon: UserCheck,
          iconClass: "bg-status-success-bg text-status-success",
        },
        has(data.inactiveStudentsCount) && {
          title: "الطلاب غير النشطين",
          value: data.inactiveStudentsCount,
          icon: UserMinus,
          iconClass: "bg-status-warning-bg text-status-warning",
        },
        has(data.groupsCount) && {
          title: "المجموعات",
          value: data.groupsCount,
          icon: LayoutGrid,
          iconClass: "bg-primary-subtle text-primary",
        },
        has(data.teachersCount) && {
          title: "المدرسون",
          value: data.teachersCount,
          icon: UserCog,
          iconClass: "bg-status-info-bg text-status-info",
        },
        has(data.assistantsCount) && {
          title: "المساعدون",
          value: data.assistantsCount,
          icon: UserRound,
          iconClass: "bg-status-info-bg text-status-info",
        },
        has(data.sessionsCount) && {
          title: "الجلسات",
          value: data.sessionsCount,
          icon: GraduationCap,
          iconClass: "bg-status-info-bg text-status-info",
        },
        has(data.presentCount) && {
          title: "حضور (الشهر)",
          value: data.presentCount,
          icon: CalendarCheck,
          iconClass: "bg-status-success-bg text-status-success",
        },
        has(data.absentCount) && {
          title: "غياب (الشهر)",
          value: data.absentCount,
          icon: CalendarX,
          iconClass: "bg-status-danger-bg text-status-danger",
        },
        has(data.attendancePercentage) && {
          title: "نسبة الحضور",
          value: `${data.attendancePercentage}%`,
          icon: TrendingUp,
          iconClass: "bg-status-success-bg text-status-success",
        },
        has(data.monthlyRevenue) && {
          title: "إيرادات الشهر",
          value: formatCurrency(data.monthlyRevenue),
          icon: TrendingUp,
          iconClass: "bg-status-success-bg text-status-success",
        },
        has(data.monthlyExpenses) && {
          title: "مصروفات الشهر",
          value: formatCurrency(data.monthlyExpenses),
          icon: ReceiptText,
          iconClass: "bg-status-danger-bg text-status-danger",
        },
        has(data.netProfit) && {
          title: "صافي الربح",
          value: formatCurrency(data.netProfit),
          icon: Wallet,
          iconClass: "bg-primary-subtle text-primary",
        },
      ].filter(Boolean)
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm">
        <span className="text-xs font-bold text-text-muted">الفترة</span>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-xl border border-surface-border bg-surface-muted/40 px-3 py-2 text-xs font-bold text-text-main focus:border-primary focus:outline-none"
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-xl border border-surface-border bg-surface-muted/40 px-3 py-2 text-xs font-bold text-text-main focus:border-primary focus:outline-none"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-surface-card p-12 text-center text-sm font-semibold text-text-muted">
          لا توجد بيانات متاحة لهذا الحساب.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </div>
      )}
    </div>
  );
}
