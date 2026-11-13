import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarCheck,
  ClipboardList,
  Clock,
  Loader2,
  NotebookText,
  PlayCircle,
  RefreshCw,
  Star,
  TrendingUp,
  Wallet,
} from "@/components/icons";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import {
  PortalSection,
  PortalStat,
  PortalStatus,
} from "../../components/portal/PortalUI";
import { studentPortalService } from "../../services/studentPortalService";
import { formatAttendanceRate } from "../../utils/attendance";
import { useAuth } from "../../context/useAuth";

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "-";
  }
}

function formatMoney(value) {
  const num = Number(value ?? 0);
  return `${num.toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م`;
}

export default function StudentDashboardPage() {
  const { hasCenterModule } = useAuth();
  const [profile, setProfile] = useState(null);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [payments, setPayments] = useState(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, e, r, a, pay, n] = await Promise.allSettled([
        studentPortalService.getProfile(),
        studentPortalService.getExams(),
        studentPortalService.getResults(),
        studentPortalService.getAttendance(),
        studentPortalService.getPayments(),
        studentPortalService.getUnreadCount(),
      ]);

      if (p.status === "fulfilled" && p.value?.succeeded) setProfile(p.value.data);
      if (e.status === "fulfilled" && e.value?.succeeded) setExams(e.value.data ?? []);
      if (r.status === "fulfilled" && r.value?.succeeded) setResults(r.value.data ?? []);
      if (a.status === "fulfilled" && a.value?.succeeded) setAttendance(a.value.data);
      if (pay.status === "fulfilled" && pay.value?.succeeded) setPayments(pay.value.data);
      if (n.status === "fulfilled" && typeof n.value?.data === "number")
        setUnread(n.value.data);
    } catch {
      toast.error("فشل في تحميل لوحة التحكم");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const actionableExams = useMemo(
    () =>
      exams.filter(
        (exam) => exam.status === "available" || exam.status === "inprogress",
      ),
    [exams],
  );

  const upcomingExams = useMemo(
    () =>
      exams
        .filter((exam) => exam.status === "upcoming")
        .sort(
          (a, b) => new Date(a.examDate ?? 0) - new Date(b.examDate ?? 0),
        ),
    [exams],
  );

  const publishedResults = useMemo(
    () => results.filter((item) => item.isPublished),
    [results],
  );

  const averagePercentage = useMemo(() => {
    const valid = publishedResults.filter((item) => Number(item.totalMark) > 0);
    if (!valid.length) return 0;
    const sum = valid.reduce(
      (acc, item) => acc + (Number(item.score) / Number(item.totalMark)) * 100,
      0,
    );
    return Math.round(sum / valid.length);
  }, [publishedResults]);

  const latestResults = useMemo(
    () =>
      [...publishedResults]
        .sort(
          (a, b) => new Date(b.submittedAt ?? 0) - new Date(a.submittedAt ?? 0),
        )
        .slice(0, 4),
    [publishedResults],
  );

  const performanceData = useMemo(
    () =>
      publishedResults
        .filter((item) => Number(item.totalMark) > 0)
        .slice()
        .sort(
          (a, b) => new Date(a.submittedAt ?? 0) - new Date(b.submittedAt ?? 0),
        )
        .map((item) => ({
          name: item.examName,
          percentage: Math.round(
            (Number(item.score) / Number(item.totalMark)) * 100,
          ),
        })),
    [publishedResults],
  );

  const stats = [
    {
      key: "exams",
      label: "امتحانات متاحة الآن",
      value: actionableExams.length,
      icon: PlayCircle,
      tone: "success",
      to: "/student/exams",
      module: "online_exams",
    },
    {
      key: "avg",
      label: "متوسط النتائج المنشورة",
      value: `${averagePercentage}%`,
      icon: Star,
      tone: "primary",
      to: "/student/results",
      module: "grades",
    },
    {
      key: "attendance",
      label: "نسبة الحضور",
      value: formatAttendanceRate(attendance?.attendancePercentage),
      icon: CalendarCheck,
      tone: "info",
      to: "/student/attendance",
      module: "attendance",
    },
    {
      key: "due",
      label: "المتبقي من الرسوم",
      value: formatMoney(payments?.totalDue),
      icon: Wallet,
      tone: "danger",
      to: "/student/payments",
      module: "payments",
    },
  ].filter((card) => hasCenterModule(card.module));

  const quickLinks = [
    {
      key: "notes",
      to: "/student/notes",
      label: "المذكرات",
      icon: NotebookText,
      module: "study_notes",
    },
    {
      key: "notifications",
      to: "/student/notifications",
      label: "الإشعارات",
      icon: Bell,
      module: "student_portal",
    },
    {
      key: "profile",
      to: "/student/profile",
      label: "بياناتي",
      icon: ClipboardList,
      module: "student_portal",
    },
  ].filter((link) => hasCenterModule(link.module));

  return (
    <div data-testid="student-dashboard-page" className="p-4 font-sans md:p-6">
      <PageHeader
        className="mb-5"
        title={profile?.fullName ? `أهلاً، ${profile.fullName}` : "لوحة التحكم"}
        subtitle={
          profile?.groups?.length
            ? profile.groups.join(" • ")
            : "نظرة سريعة على امتحاناتك ونتائجك"
        }
        actions={
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((card) => (
          <PortalStat
            key={card.key}
            label={card.label}
            value={card.value}
            icon={card.icon}
            tone={card.tone}
            to={card.to}
            testId={`student-stat-${card.key}`}
          />
        ))}
      </div>

      <PortalSection
        icon={TrendingUp}
        title="تطور الأداء عبر الزمن"
        className="mb-4"
        testId="student-performance-section"
      >
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التحميل...
          </div>
        )}

        {!loading && performanceData.length === 0 && (
          <p className="py-8 text-center text-sm text-text-muted">
            لا توجد نتائج منشورة بعد لعرض التطور.
          </p>
        )}

        {!loading && performanceData.length > 0 && (
          <div className="h-56 w-full sm:h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={performanceData}
                margin={{ top: 8, right: 16, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-surface-border, #e5e7eb)"
                />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  stroke="#9ca3af"
                  unit="%"
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "النسبة"]}
                  contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="var(--color-primary, #2563eb)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </PortalSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <PortalSection
          icon={ClipboardList}
          title="امتحانات تنتظرك"
          testId="student-actionable-exams"
          action={
            <Link
              to="/student/exams"
              className="inline-flex min-h-11 items-center px-1 text-sm font-bold text-primary"
            >
              عرض الكل
            </Link>
          }
        >
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري التحميل...
            </div>
          )}

          {!loading && actionableExams.length === 0 && (
            <p className="py-8 text-center text-sm text-text-muted">
              لا توجد امتحانات متاحة حالياً.
            </p>
          )}

          <div className="space-y-2">
            {!loading &&
              actionableExams.slice(0, 4).map((exam) => (
                <Link
                  key={exam.examId}
                  to="/student/exams"
                  className="flex items-center justify-between gap-3 rounded-control border border-surface-border bg-surface-muted/50 px-3 py-3 transition hover:bg-surface-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-text-main">
                      {exam.name}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                      <Clock className="h-3.5 w-3.5" />
                      {exam.durationMinutes} دقيقة • {exam.questionsCount} سؤال
                    </span>
                  </span>
                  <PortalStatus
                    tone={exam.status === "inprogress" ? "warning" : "success"}
                  >
                    {exam.status === "inprogress" ? "قيد الحل" : "متاح"}
                  </PortalStatus>
                </Link>
              ))}
          </div>

          {!loading && upcomingExams.length > 0 && (
            <div className="mt-4 border-t border-surface-border pt-3">
              <p className="mb-2 text-xs font-bold text-text-muted">
                امتحانات قادمة
              </p>
              <div className="space-y-1.5">
                {upcomingExams.slice(0, 3).map((exam) => (
                  <div
                    key={exam.examId}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="truncate text-text-main">{exam.name}</span>
                    <span className="shrink-0 text-text-muted">
                      {formatDateTime(exam.examDate)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PortalSection>

        <PortalSection
          icon={Star}
          title="أحدث النتائج"
          testId="student-latest-results"
          action={
            <Link
              to="/student/results"
              className="inline-flex min-h-11 items-center px-1 text-sm font-bold text-primary"
            >
              عرض الكل
            </Link>
          }
        >
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري التحميل...
            </div>
          )}

          {!loading && latestResults.length === 0 && (
            <p className="py-8 text-center text-sm text-text-muted">
              لا توجد نتائج منشورة بعد.
            </p>
          )}

          <div className="space-y-2">
            {!loading &&
              latestResults.map((item) => {
                const percentage =
                  Number(item.totalMark) > 0
                    ? Math.round((Number(item.score) / Number(item.totalMark)) * 100)
                    : 0;
                return (
                  <div
                    key={item.examId}
                    className="flex items-center justify-between gap-3 rounded-control border border-surface-border bg-surface-muted/50 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-text-main">
                        {item.examName}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {formatDateTime(item.submittedAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-left">
                      <p className="text-base font-extrabold tabular-nums text-text-main">
                        {item.score} / {item.totalMark}
                      </p>
                      <PortalStatus
                        tone={percentage >= 50 ? "success" : "danger"}
                        className="mt-1"
                      >
                        {percentage}%
                      </PortalStatus>
                    </div>
                  </div>
                );
              })}
          </div>
        </PortalSection>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          const showBadge = link.key === "notifications" && unread > 0;
          return (
            <Link
              key={link.key}
              to={link.to}
              className="flex min-h-14 items-center justify-between gap-3 rounded-card border border-surface-border bg-surface-card p-4 text-base font-bold text-text-main shadow-soft transition hover:border-primary/60 hover:bg-surface-muted"
            >
              <span className="inline-flex min-w-0 items-center gap-3">
                <Icon className="h-5 w-5 shrink-0 text-primary" />
                <span className="truncate">{link.label}</span>
              </span>
              {showBadge && (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-status-danger px-1.5 py-0.5 text-xs font-bold text-text-inverse">
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
