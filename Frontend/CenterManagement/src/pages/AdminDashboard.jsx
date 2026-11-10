import {
  Activity,
  ArrowDownLeft,
  ArrowUpLeft,
  Banknote,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarX,
  Clock,
  DollarSign,
  GraduationCap,
  Inbox,
  Lightbulb,
  Loader2,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
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
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "../components/ui/StatCard";
import { dashboardService } from "../services/dashboardService";
import { formatCurrency } from "../utils/formatCurrency";
import { formatAttendanceRate } from "../utils/attendance";
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

/* Chart colours come from the identity tokens, so both themes stay in sync. */
const CHART = {
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary)",
  info: "var(--color-status-info)",
  warning: "var(--color-status-warning)",
  success: "var(--color-status-success)",
  danger: "var(--color-status-danger)",
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

/**
 * The chart adapts to its own container, not the viewport: ticks thin out and
 * bars get slimmer on a phone, while the same component scales up on desktop.
 */
function useElementWidth() {
  const [el, setEl] = useState(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!el) return undefined;

    const update = () => setWidth(el.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") {
      update();
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);

  return [setEl, width];
}

export function tickInterval(width) {
  // Horizontal month labels: on narrow cards show every second month with its
  // full Arabic name; wide cards can afford all twelve. The tooltip still
  // carries the exact month + values for the bar that was tapped.
  if (!width) return 0;
  return width < 720 ? 1 : 0;
}

function barWidth(width, max = 24) {
  if (!width) return max;
  if (width < 380) return 8;
  if (width < 560) return 12;
  return max;
}

export default function AdminDashboard() {
  const now = new Date();
  const { hasModule } = useAuth();
  const showPayments = hasModule("payments");
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

  const [movementRef, movementWidth] = useElementWidth();
  const [revenueRef, revenueWidth] = useElementWidth();
  const [attendanceRef, attendanceWidth] = useElementWidth();

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
    // The backend gates revenue on `payments` and attendance/top-groups on
    // `attendance`. Calling a disabled module would return 403 and fail the
    // whole Promise.all, so those requests are skipped up-front.
    const skipped = Promise.resolve([]);

    const [sumData, distData, revData, moveData, attData, groupsData, activityData] =
      await Promise.all([
        dashboardService.getSummary({
          year: selectedYear,
          month: selectedMonth,
        }),
        dashboardService.getStudentDistribution(),
        showPayments
          ? dashboardService.getRevenueChart({ year: selectedYear })
          : skipped,
        dashboardService.getStudentMovement({ year: selectedYear }),
        showAttendance ? dashboardService.getAttendanceChart() : skipped,
        showAttendance ? dashboardService.getTopGroups() : skipped,
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
  }, [selectedYear, selectedMonth, showPayments, showAttendance]);

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

  const lowAttendanceGroups = useMemo(
    () =>
      !showAttendance
        ? 0
        : topGroups.filter((group) => {
            const rate = Number(group.attendanceRate);
            return Number.isFinite(rate) && rate < 75;
          }).length,
    [topGroups, showAttendance],
  );

  if (error && !summary) {
    return (
      <ErrorState message={error} onRetry={loadData} loading={loading} />
    );
  }

  return (
    <div
      dir="rtl"
      data-testid="admin-dashboard"
      className="min-h-dvh w-full bg-surface-bg text-text-main"
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 pb-24 pt-4 md:px-6 md:pt-6 wide:max-w-[1600px] ultra:max-w-[1760px]">
        {/* ================= WELCOME BANNER ================= */}
        <header
          data-testid="dashboard-hero"
          className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary via-primary to-primary-hover p-5 text-primary-contrast shadow-card dark:from-primary-subtle dark:via-primary-subtle dark:to-surface-card dark:text-text-main sm:p-6 lg:p-7"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-primary-contrast/10 dark:bg-primary/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-secondary/20 dark:bg-secondary/10"
          />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold opacity-95">
                <Activity className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>نبض السنتر</span>
                <span aria-hidden="true">·</span>
                <span>
                  {monthLabel} {selectedYear}
                </span>
              </p>

              <h1 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">
                لوحة التحكم
              </h1>
              <p className="mt-1 break-words text-sm leading-7 opacity-95 sm:text-base">
                نظرة شاملة على أداء السنتر
              </p>
            </div>

            <div className="rounded-card border border-primary-contrast/20 bg-primary-contrast/10 p-3 dark:border-primary/20 dark:bg-primary/10">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
                <label className="flex min-w-0 flex-col gap-1 text-sm font-bold">
                  الشهر
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    data-testid="dashboard-month"
                    className="min-h-11 w-full cursor-pointer rounded-control border border-surface-border bg-surface-card px-3 text-sm font-semibold text-text-main outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 sm:min-w-[140px]"
                  >
                    {MONTHS.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-w-0 flex-col gap-1 text-sm font-bold">
                  السنة
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    data-testid="dashboard-year"
                    className="num min-h-11 w-full cursor-pointer rounded-control border border-surface-border bg-surface-card px-3 text-sm font-semibold text-text-main outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 sm:min-w-[120px]"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={loadData}
                  disabled={loading}
                  data-testid="dashboard-refresh"
                  className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-surface-card px-4 text-sm font-bold text-primary transition-colors hover:bg-surface-muted disabled:opacity-60 sm:col-span-1"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                  تحديث
                </button>
              </div>
            </div>
          </div>
        </header>

        <div
          className={`space-y-6 transition-opacity duration-200 ${
            loading ? "opacity-70" : "opacity-100"
          }`}
        >
          {!isInitialLoading && summary && (
            <InsightBanner
              summary={summary}
              lowAttendanceGroups={lowAttendanceGroups}
              showAttendance={showAttendance}
            />
          )}

          {/* ================= STUDENT OVERVIEW ================= */}
          <section data-testid="section-students">
            <SectionHeading
              icon={Users}
              title="نظرة عامة على الطلاب"
              subtitle={`إحصائيات الطلاب لشهر ${monthLabel} ${selectedYear}`}
            />

            {isInitialLoading ? (
              <div className="cq-host">
                <div className="card-grid">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <StatCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="cq-host">
                <div className="card-grid">
                  <StatCard
                    label="إجمالي الطلاب"
                    value={summary?.totalStudents ?? 0}
                    icon={Users}
                    tone="primary"
                  />
                  <StatCard
                    label="الطلاب النشطين"
                    value={summary?.activeStudents ?? 0}
                    icon={UserCheck}
                    tone="success"
                  />
                  <StatCard
                    label="الطلاب غير النشطين"
                    value={summary?.inactiveStudents ?? 0}
                    icon={UserX}
                    tone="warning"
                  />
                  <StatCard
                    label="إجمالي الطلاب المحذوفين"
                    value={summary?.deletedStudents ?? 0}
                    icon={UserX}
                    tone="danger"
                  />
                </div>
              </div>
            )}
          </section>

          {/* ================= STUDENT MOVEMENT ================= */}
          <section data-testid="section-movement">
            <SectionHeading
              icon={Activity}
              title="حركة الطلاب"
              subtitle="مقارنة الطلاب الجدد بالطلاب الذين غادروا خلال الفترة المحددة"
            />

            {isInitialLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <StatCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="طلاب جدد هذا الشهر"
                  value={summary?.monthlyStudents ?? 0}
                  icon={UserPlus}
                  tone="success"
                />
                <StatCard
                  label="طلاب غادروا هذا الشهر"
                  value={summary?.monthlyDeletedStudents ?? 0}
                  icon={UserMinus}
                  tone="danger"
                />
                <StatCard
                  label="صافي نمو الطلاب"
                  value={netStudentGrowth}
                  icon={netStudentGrowth >= 0 ? TrendingUp : TrendingDown}
                  tone="primary"
                />
              </div>
            )}
          </section>

          {/* ================= MOVEMENT TREND ================= */}
          <section data-testid="section-movement-chart">
            <SectionHeading
              icon={BarChart3}
              title="حركة الطلاب خلال السنة"
              subtitle={`الطلاب الجدد والذين غادروا شهريًا خلال عام ${selectedYear}`}
            />

            <ChartCard id="movement">
              <ChartLegend
                items={[
                  { label: "طلاب جدد", color: CHART.primary },
                  { label: "غادروا", color: CHART.secondary },
                  { label: "صافي النمو", color: CHART.info, line: true },
                ]}
              />

              {isInitialLoading ? (
                <ChartSkeleton />
              ) : movementHasData ? (
                <div ref={movementRef} className="h-56 min-w-0 xs:h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={movementData}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      accessibilityLayer
                    >
                      <CartesianGrid
                        stroke="var(--color-surface-border)"
                        strokeDasharray="3 6"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="monthName"
                        tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                        tickMargin={8}
                        minTickGap={8}
                        interval={tickInterval(movementWidth)}
                        angle={0}
                        textAnchor="middle"
                        height={34}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                        tickFormatter={compactNumber}
                        width={40}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        trigger="click"
                        cursor={{ fill: "var(--color-surface-muted)", opacity: 0.5 }}
                        content={<ChartTooltip />}
                      />
                      <Bar
                        dataKey="newStudents"
                        name="طلاب جدد"
                        fill={CHART.primary}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={barWidth(movementWidth, 20)}
                        animationDuration={180}
                      />
                      <Bar
                        dataKey="departedStudents"
                        name="غادروا"
                        fill={CHART.secondary}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={barWidth(movementWidth, 20)}
                        animationDuration={180}
                      />
                      <Line
                        type="monotone"
                        dataKey="netGrowth"
                        name="صافي النمو"
                        stroke={CHART.info}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5 }}
                        animationDuration={180}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState message="لا توجد بيانات متاحة للفترة المحددة" />
              )}
            </ChartCard>
          </section>

          {/* ================= FINANCIAL OVERVIEW ================= */}
          {showAccounting || showPayments ? (
            <section data-testid="section-finance">
              <SectionHeading
                icon={Wallet}
                title="الوضع المالي"
                subtitle={`الإيرادات والمصروفات والأرباح لشهر ${monthLabel} ${selectedYear}`}
              />

              {isInitialLoading ? (
                <div className="cq-host">
                  <div className="card-grid">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <MoneyCardSkeleton key={i} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="cq-host">
                  <div className="card-grid">
                    {showPayments && (
                      <MoneyCard
                        title="إيرادات الشهر"
                        value={summary?.monthlyRevenue ?? 0}
                        icon={DollarSign}
                        tone="success"
                        current={summary?.monthlyRevenue ?? 0}
                        previous={summary?.previousMonthRevenue ?? 0}
                      />
                    )}
                    {showAccounting && (
                      <MoneyCard
                        title="مصروفات الشهر"
                        value={summary?.monthlyExpenses ?? 0}
                        icon={Wallet}
                        tone="warning"
                        current={summary?.monthlyExpenses ?? 0}
                        previous={summary?.previousMonthExpenses ?? 0}
                      />
                    )}
                    {showAccounting && (
                      <MoneyCard
                        title="مرتبات المساعدين"
                        value={summary?.monthlyAssistantSalaries ?? 0}
                        icon={Banknote}
                        tone="info"
                        current={summary?.monthlyAssistantSalaries ?? 0}
                        previous={summary?.previousMonthAssistantSalaries ?? 0}
                      />
                    )}
                    {showPayments && showAccounting && (
                      <MoneyCard
                        title="صافي الربح"
                        value={summary?.netProfit ?? 0}
                        icon={TrendingUp}
                        tone="primary"
                        current={summary?.netProfit ?? 0}
                        previous={previousNetProfit}
                      />
                    )}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {/* ================= REVENUE VS EXPENSES ================= */}
          {showAccounting && showPayments && (
            <section data-testid="section-revenue-chart">
              <SectionHeading
                icon={BarChart3}
                title="الإيرادات مقابل المصروفات"
                subtitle={`البيانات الشهرية لعام ${selectedYear}`}
              />

              <ChartCard id="revenue">
                <ChartLegend
                  items={[
                    { label: "الإيرادات", color: CHART.primary },
                    { label: "المصروفات", color: CHART.warning },
                  ]}
                />

                {isInitialLoading ? (
                  <ChartSkeleton />
                ) : revenueHasData ? (
                  <div ref={revenueRef} className="h-56 min-w-0 xs:h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={revenueData}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        barCategoryGap="24%"
                        accessibilityLayer
                      >
                        <CartesianGrid
                          stroke="var(--color-surface-border)"
                          strokeDasharray="3 6"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="monthName"
                          tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                          tickMargin={8}
                          minTickGap={8}
                          interval={tickInterval(revenueWidth)}
                          angle={0}
                          textAnchor="middle"
                          height={34}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                          tickFormatter={compactNumber}
                          width={40}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          trigger="click"
                          cursor={{
                            fill: "var(--color-surface-muted)",
                            opacity: 0.5,
                          }}
                          content={
                            <ChartTooltip
                              formatValue={(value) => formatCurrency(value)}
                            />
                          }
                        />
                        <Bar
                          dataKey="revenue"
                          name="الإيرادات"
                          fill={CHART.primary}
                          radius={[6, 6, 0, 0]}
                          maxBarSize={barWidth(revenueWidth, 24)}
                          animationDuration={180}
                        />
                        <Bar
                          dataKey="expenses"
                          name="المصروفات"
                          fill={CHART.warning}
                          radius={[6, 6, 0, 0]}
                          maxBarSize={barWidth(revenueWidth, 24)}
                          animationDuration={180}
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

          {/* ================= DISTRIBUTION + ATTENDANCE ================= */}
          <div
            className={`grid grid-cols-1 gap-4 ${
              showAttendance ? "lg:grid-cols-3" : "lg:grid-cols-1"
            }`}
          >
            <ChartCard
              id="distribution"
              title="حالة الطلاب"
              subtitle="النشط / غير النشط / المحذوف"
            >
              <StudentDistributionDonut summary={summary} />
            </ChartCard>

            {showAttendance && (
              <ChartCard
                id="attendance"
                title="الحضور"
                subtitle={`حضور شهر ${monthLabel} ${selectedYear}`}
              >
                <AttendanceOverview summary={summary} />
              </ChartCard>
            )}

            {showAttendance && (
              <ChartCard
                id="daily-attendance"
                title="معدل الحضور اليومي"
                subtitle="آخر 7 أيام"
              >
                {isInitialLoading ? (
                  <ChartSkeleton className="h-64" />
                ) : attendanceHasData ? (
                  <div
                    ref={attendanceRef}
                    className="h-56 min-w-0 xs:h-64"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={attendanceData}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        barCategoryGap="30%"
                        accessibilityLayer
                      >
                        <CartesianGrid
                          stroke="var(--color-surface-border)"
                          strokeDasharray="3 6"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="dayName"
                          tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                          tickMargin={8}
                          minTickGap={4}
                          interval={0}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          unit="%"
                          tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                          width={40}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          trigger="click"
                          cursor={{
                            fill: "var(--color-surface-muted)",
                            opacity: 0.5,
                          }}
                          content={
                            <ChartTooltip
                              formatValue={(value) => `${value}%`}
                            />
                          }
                        />
                        <Bar
                          dataKey="attendanceRate"
                          name="نسبة الحضور"
                          fill={CHART.primary}
                          radius={[8, 8, 0, 0]}
                          maxBarSize={barWidth(attendanceWidth, 44)}
                          animationDuration={180}
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

          {/* ================= GROUPS ================= */}
          <section data-testid="section-groups">
            <SectionHeading
              icon={BookOpen}
              title="المجموعات"
              subtitle={
                showAttendance
                  ? "إحصائيات المجموعات وأداء الحضور"
                  : "إحصائيات المجموعات"
              }
            />

            <div
              className={`grid grid-cols-1 gap-4 ${
                showAttendance ? "lg:grid-cols-3" : "lg:grid-cols-1"
              }`}
            >
              <div className="flex min-w-0 flex-col justify-between gap-4 rounded-card border border-surface-border bg-surface-card p-4 shadow-soft sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-status-info-bg text-status-info">
                    <GraduationCap className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-text-muted">
                      إجمالي المجموعات
                    </p>
                    <p className="num break-words text-2xl font-extrabold text-text-main">
                      {summary?.totalGroups ?? 0}
                    </p>
                  </div>
                </div>

                <div className="border-t border-surface-border pt-4">
                  <p className="break-words text-sm font-semibold text-text-muted">
                    متوسط عدد الطلاب في المجموعة
                  </p>
                  <p className="mt-1 break-words text-xl font-extrabold text-text-main">
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

              {showAttendance && (
                <ChartCard
                  id="top-groups"
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
              )}
            </div>
          </section>

          {/* ================= RECENT ACTIVITY ================= */}
          {recentActivity.length > 0 && (
            <section data-testid="section-activity">
              <SectionHeading
                icon={Activity}
                title="آخر النشاطات"
                subtitle="أحدث العمليات المسجلة في النظام"
              />

              <div className="rounded-card border border-surface-border bg-surface-card p-2 shadow-soft md:p-3">
                {isInitialLoading ? (
                  <div className="space-y-1 p-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-12 rounded-control bg-surface-muted animate-pulse"
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
                          className="flex items-start gap-3 px-2 py-3 sm:px-3"
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control ${meta.cls}`}
                          >
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <p className="min-w-0 flex-1 break-words text-sm font-medium text-text-main">
                            {item.description}
                          </p>
                          <span className="shrink-0 whitespace-nowrap text-sm text-text-muted">
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
    </div>
  );
}

/* ======================================================================
   Insight banner (real, data-driven — never a fake number)
   ====================================================================== */
function InsightBanner({ summary, lowAttendanceGroups, showAttendance }) {
  const inactive = Number(summary?.inactiveStudents) || 0;
  // Attendance fields are already null server-side when the module is off;
  // this guard keeps the copy honest even if a stale payload arrives.
  const absent = showAttendance ? Number(summary?.monthlyAbsentCount) || 0 : 0;

  // Deliberately no payments/overdue here: the banner only surfaces data the
  // caller can act on in the core/academic scope.
  const items = [];
  if (inactive) items.push(`${inactive} طالب غير نشط`);
  if (absent) items.push(`${absent} سجل غياب هذا الشهر`);
  if (showAttendance && lowAttendanceGroups)
    items.push(`${lowAttendanceGroups} مجموعة حضورها أقل من 75%`);

  if (!items.length) return null;

  return (
    <section
      data-testid="dashboard-insight"
      role="status"
      className="flex flex-col gap-3 rounded-card border border-status-warning/30 bg-status-warning-bg p-4 text-status-warning sm:flex-row sm:items-center"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-status-warning/15">
        <Lightbulb className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold sm:text-base">تحتاج متابعة</p>
        <p className="mt-0.5 break-words text-sm">{items.join(" · ")}</p>
      </div>
    </section>
  );
}

/* ======================================================================
   Section heading
   ====================================================================== */
function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary-subtle text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 className="break-words text-base font-extrabold text-text-main sm:text-lg">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 break-words text-sm text-text-muted">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/* ======================================================================
   Card shell
   ====================================================================== */
function ChartCard({ id, title, subtitle, className = "", children }) {
  return (
    <div
      data-testid={id ? `chart-${id}` : undefined}
      className={`min-w-0 rounded-card border border-surface-border bg-surface-card p-4 shadow-soft sm:p-5 ${className}`}
    >
      {title && (
        <h3 className="break-words text-base font-extrabold text-text-main">
          {title}
        </h3>
      )}
      {subtitle && (
        <p className="mt-0.5 break-words text-sm text-text-muted">{subtitle}</p>
      )}
      <div className={title ? "mt-3" : ""}>{children}</div>
    </div>
  );
}

/* ======================================================================
   Chart legend + tooltip (theme-aware, touch friendly)
   ====================================================================== */
function ChartLegend({ items }) {
  return (
    <ul className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-1.5 text-sm font-semibold text-text-muted"
        >
          <span
            className={
              item.line
                ? "h-0.5 w-4 rounded-pill"
                : "h-2.5 w-2.5 rounded-full"
            }
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function ChartTooltip({ active, payload, label, formatValue }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      dir="rtl"
      className="min-w-40 rounded-control border border-surface-border bg-surface-card px-3 py-2 text-sm shadow-card"
    >
      {label && (
        <p className="mb-1.5 font-extrabold text-text-main">{label}</p>
      )}
      <ul className="space-y-1">
        {payload.map((item, index) => (
          <li
            key={`${item.dataKey}-${index}`}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex items-center gap-1.5 text-text-muted">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor:
                    item.color || item.payload?.color || item.payload?.fill,
                }}
                aria-hidden="true"
              />
              {item.name}
            </span>
            <span className="num font-bold text-text-main">
              {formatValue ? formatValue(item.value, item.name) : item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ======================================================================
   Skeletons
   ====================================================================== */
function StatCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-card border border-surface-border bg-surface-card p-4 shadow-soft sm:p-5">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-control bg-surface-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
        <div className="h-6 w-14 animate-pulse rounded bg-surface-muted" />
      </div>
    </div>
  );
}

function MoneyCardSkeleton() {
  return (
    <div className="space-y-3 rounded-card border border-surface-border bg-surface-card p-4 shadow-soft sm:p-5">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-control bg-surface-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
      </div>
      <div className="h-7 w-28 animate-pulse rounded bg-surface-muted" />
      <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
    </div>
  );
}

function ChartSkeleton({ className = "h-56 xs:h-64 sm:h-72" }) {
  return (
    <div
      className={`animate-pulse rounded-control bg-surface-muted ${className}`}
    />
  );
}

/* ======================================================================
   Financial card with previous-month comparison
   ====================================================================== */
const MONEY_TONES = {
  primary: "bg-primary-subtle text-primary",
  success: "bg-status-success-bg text-status-success",
  warning: "bg-status-warning-bg text-status-warning",
  info: "bg-status-info-bg text-status-info",
};

function MoneyCard({ title, value, icon: Icon, tone = "primary", current, previous }) {
  const delta = computeDelta(current, previous);
  const DirectionIcon = delta >= 0 ? ArrowUpLeft : ArrowDownLeft;

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-card border border-surface-border bg-surface-card p-4 shadow-soft sm:p-5">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-control ${MONEY_TONES[tone]}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="break-words text-sm font-semibold text-text-muted">
          {title}
        </p>
      </div>

      <p className="num break-words text-xl font-extrabold text-text-main sm:text-2xl">
        {formatCurrency(value)}
      </p>

      <div className="flex min-h-6 flex-wrap items-center gap-1.5">
        {delta == null ? (
          <span className="text-sm text-text-muted">
            لا توجد بيانات سابقة للمقارنة
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-text-muted">
              <DirectionIcon className="h-4 w-4" aria-hidden="true" />
              {Math.abs(delta).toFixed(1)}%
            </span>
            <span className="text-sm text-text-muted">عن الشهر السابق</span>
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
      color: CHART.success,
    },
    {
      name: "الطلاب غير النشطين",
      value: Number(summary?.inactiveStudents) || 0,
      color: CHART.warning,
    },
    {
      name: "الطلاب المحذوفين",
      value: Number(summary?.deletedStudents) || 0,
      color: CHART.danger,
    },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return <EmptyState message="لا توجد بيانات توزيع متاحة" compact />;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-44 w-44 sm:h-48 sm:w-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer>
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
              animationDuration={180}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              trigger="click"
              content={
                <ChartTooltip formatValue={(value) => `${value} طالب`} />
              }
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-xl font-black text-text-main">{total}</span>
          <span className="text-sm text-text-muted">إجمالي</span>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {data.map((item) => (
          <li key={item.name} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: item.color }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 break-words text-sm leading-snug text-text-muted">
              {item.name}
            </span>
            <span className="num text-sm font-extrabold text-text-main">
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ======================================================================
   Attendance overview (unified rate + the four statuses)
   ====================================================================== */
function AttendanceOverview({ summary }) {
  // null means "nothing countable" (e.g. every session was excused): show "—",
  // never a fake 0%.
  const rate =
    summary?.attendancePercentage === null ||
    summary?.attendancePercentage === undefined
      ? null
      : Number(summary.attendancePercentage);

  const present = Number(summary?.monthlyPresentCount) || 0;
  const absent = Number(summary?.monthlyAbsentCount) || 0;
  const late = Number(summary?.monthlyLateCount) || 0;
  const excused = Number(summary?.monthlyExcusedCount) || 0;
  const totalAttendance = Number(summary?.monthlyAttendanceCount) || 0;

  const statusCards = [
    {
      key: "present",
      label: "حضور",
      value: present,
      icon: CalendarCheck,
      className: "bg-status-success-bg text-status-success",
    },
    {
      key: "absent",
      label: "غياب",
      value: absent,
      icon: CalendarX,
      className: "bg-status-danger-bg text-status-danger",
    },
    {
      key: "late",
      label: "تأخر",
      value: late,
      icon: Clock,
      className: "bg-status-warning-bg text-status-warning",
    },
    {
      key: "excused",
      label: "بعذر",
      value: excused,
      icon: ShieldCheck,
      className: "bg-status-info-bg text-status-info",
    },
  ];

  return (
    <div className="flex flex-col items-center gap-5">
      <RadialProgress percent={rate} />

      <div className="grid w-full grid-cols-2 gap-2.5">
        {statusCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.key}
              className={`min-w-0 rounded-control p-3 text-center ${card.className}`}
            >
              <p className="flex items-center justify-center gap-1 text-lg font-extrabold">
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="num">{card.value}</span>
              </p>
              <p className="mt-0.5 text-sm font-semibold">{card.label}</p>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-text-muted">
        {totalAttendance > 0
          ? `إجمالي سجلات الحضور: ${totalAttendance}`
          : "لا توجد سجلات حضور للفترة المحددة"}
      </p>
    </div>
  );
}

function RadialProgress({ percent, size = 140, strokeWidth = 10 }) {
  const hasRate = percent !== null && percent !== undefined;
  const safePercent = hasRate
    ? Math.min(Math.max(Number(percent) || 0, 0), 100)
    : 0;
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
        <span className="num text-2xl font-black text-text-main">
          {formatAttendanceRate(percent)}
        </span>
        <span className="text-sm text-text-muted">نسبة الحضور</span>
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
        const hasRate =
          group.attendanceRate !== null && group.attendanceRate !== undefined;
        const rate = hasRate
          ? Math.min(Math.max(Number(group.attendanceRate) || 0, 0), 100)
          : 0;
        const width = hasRate ? Math.max((rate / maxRate) * 100, 4) : 0;

        return (
          <li key={`${group.rank}-${group.groupName}`} className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="min-w-0 break-words text-sm font-bold leading-snug text-text-main">
                {group.groupName}
                <span className="font-medium text-text-muted">
                  {" "}
                  ({group.rank})
                </span>
              </span>
              <span className="break-words text-sm text-text-muted">
                {group.studentsCount} طالب ·{" "}
                <span className="font-bold text-status-success">
                  {formatAttendanceRate(group.attendanceRate)}
                </span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-pill bg-surface-muted">
              <div
                className="h-full rounded-pill bg-primary transition-all duration-300"
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
function EmptyState({
  message = "لا توجد بيانات متاحة للفترة المحددة",
  compact = false,
}) {
  return (
    <div
      className={`flex min-w-0 flex-col items-center justify-center gap-2 text-center ${
        compact ? "py-6" : "py-12"
      }`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-control bg-surface-muted text-text-muted">
        <Inbox className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="break-words text-sm text-text-muted">{message}</p>
    </div>
  );
}

/* ======================================================================
   Error state
   ====================================================================== */
function ErrorState({ message, onRetry, loading }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-status-danger-bg text-status-danger">
        <Inbox className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mb-1 text-lg font-extrabold text-text-main">
        تعذر تحميل لوحة التحكم
      </h2>
      <p className="mb-6 max-w-md break-words text-sm text-text-muted">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={loading}
        className="inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-5 text-sm font-bold text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        )}
        إعادة المحاولة
      </button>
    </div>
  );
}
