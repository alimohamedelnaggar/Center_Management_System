import {
  Activity,
  ArrowDownLeft,
  ArrowUpLeft,
  Banknote,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarX,
  DollarSign,
  GraduationCap,
  Inbox,
  Loader2,
  ReceiptText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  UserX,
  Wallet,
} from "@/components/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboardService } from "../services/dashboardService";
import { formatCurrency } from "../utils/formatCurrency";
import { useAuth } from "../context/useAuth";

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

const ACTIVITY_META = {
  student_added: { icon: UserPlus, cls: "bg-status-success-bg text-status-success" },
  student_deleted: { icon: UserX, cls: "bg-status-danger-bg text-status-danger" },
  payment_created: { icon: Wallet, cls: "bg-status-info-bg text-status-info" },
  expense_created: { icon: ReceiptText, cls: "bg-status-warning-bg text-status-warning" },
  income_created: { icon: TrendingUp, cls: "bg-status-success-bg text-status-success" },
  assistant_salary: { icon: Banknote, cls: "bg-status-info-bg text-status-info" },
  attendance_present: { icon: CalendarCheck, cls: "bg-status-success-bg text-status-success" },
  attendance_absent: { icon: CalendarX, cls: "bg-status-danger-bg text-status-danger" },
};

function toArray(value) {
  return Array.isArray(value) ? value : value?.data || [];
}

function computeDelta(current, previous) {
  const prev = Number(previous);
  if (!prev || Number.isNaN(prev)) return null;
  return ((Number(current) - prev) / prev) * 100;
}

function compactNumber(value) {
  const num = Number(value) || 0;
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return `${num}`;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function AdminDashboard() {
  const now = new Date();
  const { hasModule } = useAuth();
  const showAccounting = hasModule("accounting");
  const showAttendance = hasModule("attendance");

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [summary, setSummary] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [movementData, setMovementData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [topGroups, setTopGroups] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const result = [];
    for (let year = currentYear + 2; year >= 2022; year -= 1) {
      result.push(year);
    }
    return result.sort((a, b) => a - b);
  }, []);

  const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || "";

  const fetchData = useCallback(async () => {
    const [sumData, distData, revData, moveData, attData, groupsData, activityData] =
      await Promise.all([
        dashboardService.getSummary({
          year: selectedYear,
          month: selectedMonth,
        }),
        dashboardService.getStudentDistribution(),
        dashboardService.getRevenueChart({ year: selectedYear }),
        dashboardService.getStudentMovement({ year: selectedYear }),
        dashboardService.getAttendanceChart(),
        dashboardService.getTopGroups(),
        dashboardService.getRecentActivity(),
      ]);
    return {
      sumData,
      distData,
      revData,
      moveData,
      attData,
      groupsData,
      activityData,
    };
  }, [selectedYear, selectedMonth]);

  const applyResults = useCallback(
    ({ sumData, distData, revData, moveData, attData, groupsData, activityData }) => {
      setSummary(
        sumData && typeof sumData.totalStudents === "number"
          ? sumData
          : sumData?.data || null,
      );
      setDistribution(toArray(distData));
      setRevenueData(toArray(revData));
      setMovementData(toArray(moveData));
      setAttendanceData(toArray(attData));
      setTopGroups(toArray(groupsData));
      setRecentActivity(toArray(activityData));
    },
    [],
  );

  const handleError = useCallback((err) => {
    console.error("خطأ في جلب بيانات لوحة التحكم:", err);
    setError(
      "تعذر تحميل بيانات لوحة التحكم. تأكد من اتصال الخادم ثم أعد المحاولة.",
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchData()
      .then((data) => {
        if (!cancelled) applyResults(data);
      })
      .catch((err) => {
        if (!cancelled) handleError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchData, applyResults, handleError]);

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    fetchData()
      .then(applyResults)
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [fetchData, applyResults, handleError]);

  const isInitialLoading = loading && !summary;

  const revenueHasData = useMemo(
    () => revenueData.some((d) => Number(d.revenue) || Number(d.expenses)),
    [revenueData],
  );

  const movementHasData = useMemo(
    () =>
      movementData.some(
        (d) =>
          Number(d.newStudents) || Number(d.departedStudents) || Number(d.netGrowth),
      ),
    [movementData],
  );

  const attendanceHasData = useMemo(
    () => attendanceData.some((d) => Number(d.attendanceRate) > 0),
    [attendanceData],
  );

  const groupDistributionTotal = useMemo(
    () =>
      distribution.reduce(
        (sum, item) => sum + (Number(item.studentsCount) || 0),
        0,
      ),
    [distribution],
  );

  const avgStudentsPerGroup = distribution.length
    ? groupDistributionTotal / distribution.length
    : 0;

  const previousNetProfit = useMemo(
    () =>
      (Number(summary?.previousMonthRevenue) || 0) -
      (Number(summary?.previousMonthExpenses) || 0) -
      (Number(summary?.previousMonthAssistantSalaries) || 0),
    [summary],
  );

  const netStudentGrowth = Number(summary?.netStudentGrowth) || 0;

  if (error && !summary) {
    return (
      <ErrorState message={error} onRetry={loadData} loading={loading} />
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-[1440px] mx-auto pb-24 text-text-main">
      {/* ================= SECTION 1 — HEADER ================= */}
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-text-main">
            لوحة التحكم
          </h1>
          <p className="text-sm text-text-muted mt-1">
            نظرة شاملة على أداء السنتر
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-muted">الشهر</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="min-w-[140px] px-4 py-2.5 rounded-xl border border-surface-border bg-surface-card text-text-main font-medium outline-none focus:border-primary transition-colors cursor-pointer"
            >
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-muted">السنة</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="min-w-[120px] px-4 py-2.5 rounded-xl border border-surface-border bg-surface-card text-text-main font-medium outline-none focus:border-primary transition-colors cursor-pointer"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-text-inverse text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-60 cursor-pointer h-[46px]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </header>

      <div
        className={`space-y-8 transition-opacity duration-200 ${
          loading ? "opacity-70" : "opacity-100"
        }`}
      >
        {/* ================= SECTION 2 — STUDENT OVERVIEW ================= */}
        <section>
          <SectionHeading
            icon={Users}
            title="نظرة عامة على الطلاب"
            subtitle={`إحصائيات الطلاب لشهر ${monthLabel} ${selectedYear}`}
          />

          {isInitialLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                title="إجمالي الطلاب"
                value={summary?.totalStudents ?? 0}
                icon={Users}
                iconClass="bg-primary-subtle text-primary"
              />
              <StatCard
                title="الطلاب النشطين"
                value={summary?.activeStudents ?? 0}
                icon={UserCheck}
                iconClass="bg-status-success-bg text-status-success"
              />
              <StatCard
                title="الطلاب غير النشطين"
                value={summary?.inactiveStudents ?? 0}
                icon={UserX}
                iconClass="bg-status-warning-bg text-status-warning"
              />
              <StatCard
                title="إجمالي الطلاب المحذوفين"
                value={summary?.deletedStudents ?? 0}
                icon={UserX}
                iconClass="bg-status-danger-bg text-status-danger"
              />
            </div>
          )}
        </section>

        {/* ================= SECTION 3 — STUDENT MOVEMENT ================= */}
        <section>
          <SectionHeading
            icon={Activity}
            title="حركة الطلاب"
            subtitle="مقارنة الطلاب الجدد بالطلاب الذين غادروا خلال الفترة المحددة"
          />

          {isInitialLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <StatCard
                title="طلاب جدد هذا الشهر"
                value={summary?.monthlyStudents ?? 0}
                icon={UserPlus}
                iconClass="bg-status-success-bg text-status-success"
              />
              <StatCard
                title="طلاب غادروا هذا الشهر"
                value={summary?.monthlyDeletedStudents ?? 0}
                icon={UserMinus}
                iconClass="bg-status-danger-bg text-status-danger"
              />
              <StatCard
                title="صافي نمو الطلاب"
                value={netStudentGrowth}
                icon={netStudentGrowth >= 0 ? TrendingUp : TrendingDown}
                iconClass="bg-primary-subtle text-primary"
              />
            </div>
          )}
        </section>

        {/* ================= SECTION 4 — MOVEMENT TREND ================= */}
        <section>
          <SectionHeading
            icon={BarChart3}
            title="حركة الطلاب خلال السنة"
            subtitle={`الطلاب الجدد والذين غادروا شهريًا خلال عام ${selectedYear}`}
          />

          <ChartCard>
            {isInitialLoading ? (
              <div className="h-72 rounded-xl bg-surface-muted animate-pulse" />
            ) : movementHasData ? (
              <div className="h-72 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={movementData}
                    margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="var(--color-surface-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="monthName"
                      tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={56}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--color-surface-muted)", opacity: 0.4 }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--color-surface-border)",
                        background: "var(--color-surface-card)",
                        color: "var(--color-text-main)",
                      }}
                      formatter={(value, name) => [value, name]}
                    />
                    <Legend
                      formatter={(value) => (
                        <span className="text-xs text-text-muted">
                          {value}
                        </span>
                      )}
                    />
                    <Bar
                      dataKey="newStudents"
                      name="طلاب جدد"
                      fill="var(--color-primary)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={20}
                    />
                    <Bar
                      dataKey="departedStudents"
                      name="غادروا"
                      fill="var(--color-status-danger)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={20}
                    />
                    <Line
                      type="monotone"
                      dataKey="netGrowth"
                      name="صافي النمو"
                      stroke="var(--color-status-info)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "var(--color-status-info)" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="لا توجد بيانات متاحة للفترة المحددة" />
            )}
          </ChartCard>
        </section>

        {/* ================= SECTION 5 — FINANCIAL OVERVIEW ================= */}
        {showAccounting && (
        <section>
          <SectionHeading
            icon={Wallet}
            title="الوضع المالي"
            subtitle={`الإيرادات والمصروفات والأرباح لشهر ${monthLabel} ${selectedYear}`}
          />

          {isInitialLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <MoneyCard
                title="إيرادات الشهر"
                value={summary?.monthlyRevenue ?? 0}
                icon={DollarSign}
                iconClass="bg-status-success-bg text-status-success"
                current={summary?.monthlyRevenue ?? 0}
                previous={summary?.previousMonthRevenue ?? 0}
              />
              <MoneyCard
                title="مصروفات الشهر"
                value={summary?.monthlyExpenses ?? 0}
                icon={Wallet}
                iconClass="bg-status-warning-bg text-status-warning"
                current={summary?.monthlyExpenses ?? 0}
                previous={summary?.previousMonthExpenses ?? 0}
              />
              <MoneyCard
                title="مرتبات المساعدين"
                value={summary?.monthlyAssistantSalaries ?? 0}
                icon={Banknote}
                iconClass="bg-status-info-bg text-status-info"
                current={summary?.monthlyAssistantSalaries ?? 0}
                previous={summary?.previousMonthAssistantSalaries ?? 0}
              />
              <MoneyCard
                title="صافي الربح"
                value={summary?.netProfit ?? 0}
                icon={TrendingUp}
                iconClass="bg-primary-subtle text-primary"
                current={summary?.netProfit ?? 0}
                previous={previousNetProfit}
              />
            </div>
          )}
        </section>
        )}

        {/* ================= SECTION 6 — REVENUE VS EXPENSES ================= */}
        {showAccounting && (
        <section>
          <SectionHeading
            icon={BarChart3}
            title="الإيرادات مقابل المصروفات"
            subtitle={`البيانات الشهرية لعام ${selectedYear}`}
          />

          <ChartCard>
            {isInitialLoading ? (
              <div className="h-72 rounded-xl bg-surface-muted animate-pulse" />
            ) : revenueHasData ? (
              <div className="h-72 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={revenueData}
                    margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
                    barCategoryGap="24%"
                  >
                    <CartesianGrid
                      stroke="var(--color-surface-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="monthName"
                      tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                      tickFormatter={compactNumber}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--color-surface-muted)", opacity: 0.4 }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--color-surface-border)",
                        background: "var(--color-surface-card)",
                        color: "var(--color-text-main)",
                      }}
                      formatter={(value, name) => [
                        formatCurrency(value),
                        name,
                      ]}
                    />
                    <Legend
                      formatter={(value) => (
                        <span className="text-xs text-text-muted">
                          {value}
                        </span>
                      )}
                    />
                    <Bar
                      dataKey="revenue"
                      name="الإيرادات"
                      fill="var(--color-primary)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={34}
                    />
                    <Bar
                      dataKey="expenses"
                      name="المصروفات"
                      fill="var(--color-status-warning)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={34}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="لا توجد بيانات متاحة للفترة المحددة" />
            )}
          </ChartCard>
        </section>
        )}

        {/* ================= SECTION 7 — DISTRIBUTION + ATTENDANCE ================= */}
        <div
          className={`grid grid-cols-1 gap-4 ${
            showAttendance ? "lg:grid-cols-3" : "lg:grid-cols-1"
          }`}
        >
          <ChartCard
            title="حالة الطلاب"
            subtitle="النشط / غير النشط / المحذوف"
          >
            <StudentDistributionDonut summary={summary} />
          </ChartCard>

          {showAttendance && (
          <ChartCard
            title="الحضور"
            subtitle={`حضور شهر ${monthLabel} ${selectedYear}`}
          >
            <AttendanceOverview summary={summary} />
          </ChartCard>
          )}

          {showAttendance && (
          <ChartCard
            title="معدل الحضور اليومي"
            subtitle="آخر 7 أيام"
          >
            {isInitialLoading ? (
              <div className="h-64 rounded-xl bg-surface-muted animate-pulse" />
            ) : attendanceHasData ? (
              <div className="h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={attendanceData}
                    margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid
                      stroke="var(--color-surface-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dayName"
                      tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      unit="%"
                      tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--color-surface-muted)", opacity: 0.4 }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--color-surface-border)",
                        background: "var(--color-surface-card)",
                        color: "var(--color-text-main)",
                      }}
                      formatter={(value) => [`${value}%`, "نسبة الحضور"]}
                    />
                    <Bar
                      dataKey="attendanceRate"
                      name="نسبة الحضور"
                      fill="var(--color-primary)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={44}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="لا توجد بيانات حضور متاحة للأسبوع الحالي" />
            )}
          </ChartCard>
          )}
        </div>

        {/* ================= SECTION 8 — GROUPS ================= */}
        <section>
          <SectionHeading
            icon={BookOpen}
            title="المجموعات"
            subtitle="إحصائيات المجموعات وأداء الحضور"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Groups summary */}
            <div className="bg-surface-card rounded-2xl border border-surface-border shadow-sm p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-status-info-bg text-status-info flex items-center justify-center shrink-0">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted font-semibold min-h-[28px]">
                    إجمالي المجموعات
                  </p>
                  <p className="text-2xl font-extrabold">
                    {summary?.totalGroups ?? 0}
                  </p>
                </div>
              </div>

              <div className="border-t border-surface-border pt-4">
                <p className="text-xs text-text-muted font-semibold mb-1 min-h-[28px]">
                  متوسط عدد الطلاب في المجموعة
                </p>
                <p className="text-xl font-extrabold text-text-main">
                  {distribution.length
                    ? avgStudentsPerGroup.toFixed(1)
                    : "—"}
                  <span className="text-sm font-medium text-text-muted">
                    {" "}
                    طالب
                  </span>
                </p>
              </div>
            </div>

            {/* Top groups */}
            <ChartCard
              className="lg:col-span-2"
              title="أفضل المجموعات من حيث الحضور"
              subtitle="أعلى 5 مجموعات حسب نسبة الحضور"
            >
              {isInitialLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-40 rounded bg-surface-muted animate-pulse" />
                      <div className="h-2 rounded-full bg-surface-muted animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : topGroups.length ? (
                <TopGroupsList groups={topGroups} />
              ) : (
                <EmptyState message="لا توجد بيانات مجموعات متاحة" compact />
              )}
            </ChartCard>
          </div>
        </section>

        {/* ================= SECTION 9 — RECENT ACTIVITY ================= */}
        {recentActivity.length > 0 && (
          <section>
            <SectionHeading
              icon={Activity}
              title="آخر النشاطات"
              subtitle="أحدث العمليات المسجلة في النظام"
            />

            <div className="bg-surface-card rounded-2xl border border-surface-border shadow-sm p-2 md:p-3">
              {isInitialLoading ? (
                <div className="space-y-1 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 rounded-xl bg-surface-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <ul className="divide-y divide-surface-border">
                  {recentActivity.slice(0, 8).map((item, index) => {
                    const meta =
                      ACTIVITY_META[item.activityType] || {
                        icon: Activity,
                        cls: "bg-surface-muted text-text-muted",
                      };
                    const Icon = meta.icon;

                    return (
                      <li
                        key={`${item.date}-${index}`}
                        className="flex items-center gap-3 px-3 py-3"
                      >
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${meta.cls}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="flex-1 min-w-0 text-sm text-text-main font-medium">
                          {item.description}
                        </p>
                        <span className="text-[11px] text-text-muted whitespace-nowrap">
                          {formatDateTime(item.date)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ======================================================================
   Section heading
   ====================================================================== */
function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="h-9 w-9 rounded-xl bg-primary-subtle text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm md:text-base font-extrabold text-text-main">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-text-muted leading-snug">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/* ======================================================================
   Card shell
   ====================================================================== */
function ChartCard({ title, subtitle, className = "", children }) {
  return (
    <div
      className={`bg-surface-card rounded-2xl border border-surface-border shadow-sm p-5 min-w-0 ${className}`}
    >
      <h3 className="text-sm md:text-base font-extrabold text-text-main mb-0.5">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-text-muted leading-snug mb-4">{subtitle}</p>
      )}
      {children}
    </div>
  );
}

/* ======================================================================
   Stat card (counters) — no truncation, titles may wrap on small screens
   ====================================================================== */
function StatCard({ title, value, icon: Icon, iconClass }) {
  return (
    <div className="bg-surface-card rounded-2xl border border-surface-border shadow-sm p-4 md:p-5 flex items-center gap-4 min-w-0">
      <div
        className={`h-11 w-11 md:h-12 md:w-12 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}
      >
        <Icon className="h-5 w-5 md:h-6 md:w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] md:text-xs text-text-muted font-semibold leading-snug min-h-[24px] md:min-h-[28px]">
          {title}
        </p>
        <p className="text-lg md:text-2xl font-extrabold text-text-main">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-surface-card rounded-2xl border border-surface-border shadow-sm p-4 md:p-5 flex items-center gap-4">
      <div className="h-11 w-11 md:h-12 md:w-12 rounded-xl bg-surface-muted animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 rounded bg-surface-muted animate-pulse" />
        <div className="h-6 w-14 rounded bg-surface-muted animate-pulse" />
      </div>
    </div>
  );
}

/* ======================================================================
   Financial card with neutral previous-month comparison
   ====================================================================== */
function MoneyCard({ title, value, icon: Icon, iconClass, current, previous }) {
  const delta = computeDelta(current, previous);

  const DirectionIcon = delta >= 0 ? ArrowUpLeft : ArrowDownLeft;

  return (
    <div className="bg-surface-card rounded-2xl border border-surface-border shadow-sm p-4 md:p-5 min-w-0 flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div
          className={`h-11 w-11 md:h-12 md:w-12 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}
        >
          <Icon className="h-5 w-5 md:h-6 md:w-6" />
        </div>
        <p className="text-xs text-text-muted font-semibold leading-snug min-h-[28px]">
          {title}
        </p>
      </div>

      <p className="text-xl md:text-2xl font-extrabold text-text-main">
        {formatCurrency(value)}
      </p>

      <div className="flex items-center gap-1.5 min-h-[20px]">
        {delta == null ? (
          <span className="text-[11px] text-text-muted">
            لا توجد بيانات سابقة للمقارنة
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-text-muted">
              <DirectionIcon className="h-3.5 w-3.5" />
              {Math.abs(delta).toFixed(1)}%
            </span>
            <span className="text-[11px] text-text-muted">عن الشهر السابق</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ======================================================================
   Student distribution donut (active / inactive / deleted)
   ====================================================================== */
function StudentDistributionDonut({ summary }) {
  const data = [
    {
      name: "الطلاب النشطين",
      value: Number(summary?.activeStudents) || 0,
      color: "var(--color-status-success)",
    },
    {
      name: "الطلاب غير النشطين",
      value: Number(summary?.inactiveStudents) || 0,
      color: "var(--color-status-warning)",
    },
    {
      name: "الطلاب المحذوفين",
      value: Number(summary?.deletedStudents) || 0,
      color: "var(--color-status-danger)",
    },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return <EmptyState message="لا توجد بيانات توزيع متاحة" compact />;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="95%"
              paddingAngle={3}
              stroke="var(--color-surface-card)"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid var(--color-surface-border)",
                background: "var(--color-surface-card)",
                color: "var(--color-text-main)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-black text-text-main">{total}</span>
          <span className="text-[11px] text-text-muted">إجمالي</span>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {data.map((item) => (
          <li key={item.name} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: item.color }}
            />
            <span className="flex-1 text-xs text-text-muted leading-snug">
              {item.name}
            </span>
            <span className="text-sm font-extrabold text-text-main">
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ======================================================================
   Attendance overview (rate + present/absent)
   ====================================================================== */
function AttendanceOverview({ summary }) {
  const rate = Number(summary?.attendancePercentage) || 0;
  const present = Number(summary?.monthlyPresentCount) || 0;
  const absent = Number(summary?.monthlyAbsentCount) || 0;
  const totalAttendance = present + absent;

  return (
    <div className="flex flex-col items-center gap-5">
      <RadialProgress percent={rate} />

      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="rounded-xl bg-status-success-bg p-3 text-center">
          <p className="text-lg font-extrabold text-status-success">
            {present}
          </p>
          <p className="text-[11px] text-text-muted font-semibold mt-0.5">
            حضور
          </p>
        </div>
        <div className="rounded-xl bg-status-danger-bg p-3 text-center">
          <p className="text-lg font-extrabold text-status-danger">{absent}</p>
          <p className="text-[11px] text-text-muted font-semibold mt-0.5">
            غياب
          </p>
        </div>
      </div>

      <p className="text-[11px] text-text-muted">
        {totalAttendance > 0
          ? `إجمالي سجلات الحضور: ${totalAttendance}`
          : "لا توجد سجلات حضور للفترة المحددة"}
      </p>
    </div>
  );
}

function RadialProgress({ percent, size = 132, strokeWidth = 10 }) {
  const safePercent = Math.min(Math.max(Number(percent) || 0, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safePercent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-muted)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-text-main">
          {safePercent.toFixed(1)}%
        </span>
        <span className="text-[11px] text-text-muted">نسبة الحضور</span>
      </div>
    </div>
  );
}

/* ======================================================================
   Top groups list
   ====================================================================== */
function TopGroupsList({ groups }) {
  const maxRate = Math.max(
    ...groups.map((group) => Number(group.attendanceRate) || 0),
    1,
  );

  return (
    <ul className="space-y-4">
      {groups.map((group) => {
        const rate = Math.min(
          Math.max(Number(group.attendanceRate) || 0, 0),
          100,
        );
        const width = Math.max((rate / maxRate) * 100, 4);

        return (
          <li key={`${group.rank}-${group.groupName}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-text-main leading-snug">
                {group.groupName}
                <span className="text-text-muted font-medium"> ({group.rank})</span>
              </span>
              <span className="text-xs text-text-muted whitespace-nowrap">
                {group.studentsCount} طالب ·{" "}
                <span className="text-status-success font-bold">
                  {rate.toFixed(1)}%
                </span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ======================================================================
   Empty state
   ====================================================================== */
function EmptyState({ message = "لا توجد بيانات متاحة للفترة المحددة", compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-2 min-w-0 ${
        compact ? "py-6" : "py-12"
      }`}
    >
      <div className="h-11 w-11 rounded-xl bg-surface-muted text-text-muted flex items-center justify-center">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}

/* ======================================================================
   Error state
   ====================================================================== */
function ErrorState({ message, onRetry, loading }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="h-14 w-14 rounded-2xl bg-status-danger-bg text-status-danger flex items-center justify-center mb-4">
        <Inbox className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-extrabold text-text-main mb-1">
        تعذر تحميل لوحة التحكم
      </h2>
      <p className="text-sm text-text-muted max-w-md mb-6">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-text-inverse text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-60 cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        إعادة المحاولة
      </button>
    </div>
  );
}