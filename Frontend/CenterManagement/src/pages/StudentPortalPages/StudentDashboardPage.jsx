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
import { studentPortalService } from "../../services/studentPortalService";
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
      tone: "bg-status-success-bg text-status-success",
      to: "/student/exams",
      module: "online_exams",
    },
    {
      key: "avg",
      label: "متوسط النتائج المنشورة",
      value: `${averagePercentage}%`,
      icon: Star,
      tone: "bg-primary-subtle text-primary",
      to: "/student/results",
      module: "grades",
    },
    {
      key: "attendance",
      label: "نسبة الحضور",
      value: `${attendance?.attendancePercentage ?? 0}%`,
      icon: CalendarCheck,
      tone: "bg-status-info-bg text-status-info",
      to: "/student/attendance",
      module: "attendance",
    },
    {
      key: "due",
      label: "المتبقي من الرسوم",
      value: formatMoney(payments?.totalDue),
      icon: Wallet,
      tone: "bg-status-danger-bg text-status-danger",
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
    <div className="p-4 md:p-6 font-sans">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-main">
            {profile?.fullName ? `أهلاً، ${profile.fullName}` : "لوحة التحكم"}
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            {profile?.groups?.length
              ? profile.groups.join(" • ")
              : "نظرة سريعة على امتحاناتك ونتائجك"}
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

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.key}
              to={card.to}
              className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm transition hover:shadow-md"
            >
              <div
                className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${card.tone}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-text-main">{card.value}</p>
              <p className="mt-0.5 text-xs text-text-muted">{card.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Performance over time */}
      <section className="mb-4 rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
        <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-text-main">
          <TrendingUp className="h-4 w-4 text-primary" />
          تطور الأداء عبر الزمن
        </h2>

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
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border, #e5e7eb)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9ca3af" unit="%" />
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
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Actionable exams */}
        <section className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-sm font-bold text-text-main">
              <ClipboardList className="h-4 w-4 text-primary" />
              امتحانات تنتظرك
            </h2>
            <Link to="/student/exams" className="text-xs font-medium text-primary">
              عرض الكل
            </Link>
          </div>

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
                  className="flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface-muted/50 px-3 py-2.5 transition hover:bg-surface-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-main">
                      {exam.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
                      <Clock className="h-3.5 w-3.5" />
                      {exam.durationMinutes} دقيقة • {exam.questionsCount} سؤال
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      exam.status === "inprogress"
                        ? "bg-status-warning-bg text-status-warning"
                        : "bg-status-success-bg text-status-success"
                    }`}
                  >
                    {exam.status === "inprogress" ? "قيد الحل" : "متاح"}
                  </span>
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
        </section>

        {/* Latest results */}
        <section className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-sm font-bold text-text-main">
              <Star className="h-4 w-4 text-primary" />
              أحدث النتائج
            </h2>
            <Link to="/student/results" className="text-xs font-medium text-primary">
              عرض الكل
            </Link>
          </div>

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
                    className="flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface-muted/50 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-main">
                        {item.examName}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {formatDateTime(item.submittedAt)}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-text-main">
                        {item.score} / {item.totalMark}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          percentage >= 50
                            ? "text-status-success"
                            : "text-status-danger"
                        }`}
                      >
                        {percentage}%
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </div>

      {/* Quick links */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          const showBadge =
            link.key === "notifications" && unread > 0;
          return (
            <Link
              key={link.key}
              to={link.to}
              className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-card p-4 text-sm font-medium text-text-main shadow-sm transition hover:bg-surface-muted"
            >
              <span className="inline-flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary" />
                {link.label}
              </span>
              {showBadge && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-status-danger px-1.5 text-xs font-bold text-text-inverse">
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
