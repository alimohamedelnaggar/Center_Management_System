import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  AlertTriangle,
  Download,
  Loader2,
  Printer,
  RefreshCw,
} from "@/components/icons";

import { reportsService } from "../services/reportsService";
import { formatCurrency } from "../utils/formatCurrency";
import { getMonthLabel } from "../utils/months";
import { useAuth } from "../context/useAuth";

// ------------------------------------------------------------
// Month helpers. The backend takes `from` / `to` / `billingPeriod`
// as plain dates, so a "YYYY-MM" month picker becomes "YYYY-MM-01".
// `to` is exclusive, so it is the 1st of the month AFTER the range.
// ------------------------------------------------------------
const pad2 = (n) => String(n).padStart(2, "0");

const toDay1 = (ym) => (ym ? `${ym}-01` : null);

const monthShift = (ym, delta) => {
  if (!ym) return null;
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
};

const toYearMonth = (ym) => {
  if (!ym) return { year: null, month: null };
  const [year, month] = ym.split("-").map(Number);
  return { year, month };
};

const now = new Date();
const CURRENT_MONTH = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;

// ------------------------------------------------------------
// Row builders (pure, so the print view and the CSV export can
// share exactly the same headers as the tables on screen).
// ------------------------------------------------------------
const TEACHER_HEADERS = [
  "م",
  "المدرس",
  "عدد المجموعات",
  "عدد الطلاب",
  "المحصّل في الفترة",
  "نسبة الحضور",
];

const GROUP_HEADERS = [
  "م",
  "المجموعة",
  "المدرس",
  "الطلاب",
  "نسبة الحضور",
  "المتوقع للشهر",
  "المحصّل للشهر",
  "المتبقي للشهر",
];

const toTeacherRow = (t, i) => [
  i + 1,
  t.teacherName,
  t.groupsCount,
  t.studentsCount,
  Number(t.collectedInRange).toFixed(2),
  `${Number(t.attendanceRate).toFixed(2)}%`,
];

const GROUP_HEADERS_SOLO = [
  "م",
  "المجموعة",
  "المادة",
  "الطلاب",
  "نسبة الحضور",
  "المتوقع للشهر",
  "المحصّل للشهر",
  "المتبقي للشهر",
];

const toGroupRow = (g, i, subject = null) => [
  i + 1,
  g.groupName,
  subject ?? (g.teacherName || "—"),
  g.studentsCount,
  `${Number(g.attendanceRate).toFixed(2)}%`,
  Number(g.expected).toFixed(2),
  Number(g.collected).toFixed(2),
  Number(g.outstanding).toFixed(2),
];

const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const tableToCsv = (headers, rows) =>
  [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");

export default function CenterReportsPage() {
  const { hasModule } = useAuth();
  const showPayments = hasModule("payments");
  const showAccounting = hasModule("accounting");
  const showAttendance = hasModule("attendance");
  // =========================================================
  // Filters
  // =========================================================
  const [fromYm, setFromYm] = useState(CURRENT_MONTH);
  const [toYm, setToYm] = useState(monthShift(CURRENT_MONTH, 1));
  const [billingYm, setBillingYm] = useState(CURRENT_MONTH);

  // =========================================================
  // Data
  // =========================================================
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await reportsService.getCenterOverview({
        from: toDay1(fromYm),
        // `to` is exclusive -> include the whole selected month.
        to: toDay1(monthShift(toYm, 1)),
        billingPeriod: toDay1(billingYm),
      });
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "تعذّر تحميل التقرير");
      toast.error("تعذّر تحميل تقرير المركز");
    } finally {
      setLoading(false);
    }
  }, [fromYm, toYm, billingYm]);

  useEffect(() => {
    load();
  }, [load]);

  // Adds the body scope used by the @media print rules in index.css, so the
  // sidebar/chrome is dropped whether the user hits the button or Ctrl+P.
  useEffect(() => {
    const mark = () => document.body.classList.add("center-reports-printing");
    const unmark = () => document.body.classList.remove("center-reports-printing");

    window.addEventListener("beforeprint", mark);
    window.addEventListener("afterprint", unmark);

    return () => {
      window.removeEventListener("beforeprint", mark);
      window.removeEventListener("afterprint", unmark);
      unmark();
    };
  }, []);

  const totals = data?.totals;
  const finance = data?.finance;
  const teachers = useMemo(() => data?.teachers ?? [], [data]);
  const groups = useMemo(() => data?.groups ?? [], [data]);
  // A solo center has no per-teacher breakdown; show the teacher's subject in
  // the groups table instead and hide the "بالمدرسون" section entirely.
  const isSoloReport = data?.centerType === "SoloTeacher";
  const soloTeacherSubject = data?.soloTeacherSubject ?? null;

  // =========================================================
  // 6-month trend (income vs operational expenses)
  // =========================================================
  const trendData = useMemo(
    () =>
      (data?.trend ?? []).map((point) => ({
        name: getMonthLabel(point.month),
        year: point.year,
        income: Number(point.income ?? 0),
        expenses: Number(point.expenses ?? 0),
      })),
    [data],
  );

  // =========================================================
  // Printing + CSV
  // =========================================================
  const handlePrint = () => window.print();

  const handleExportCsv = () => {
    if (!data) return;

    const header = [
      "تقرير المركز",
      `من ${fromYm || "-"} إلى ${toYm || "-"}`,
      `شهر الفوترة ${billingYm || "-"}`,
      "",
    ];

    const summary = [
      ["الإجماليات", ""],
      ["الطلاب النشطون", totals?.activeStudents ?? 0],
      ["المدرسون", totals?.teachers ?? 0],
      ["المساعدون", totals?.assistants ?? 0],
      ["المجموعات", totals?.groups ?? 0],
      ["", ""],
      ["القيود المالية للفترة", ""],
      ["مدفوعات الطلاب المحصّلة", Number(finance?.studentPaymentsCollected ?? 0).toFixed(2)],
      ["إيرادات أخرى", Number(finance?.otherIncomes ?? 0).toFixed(2)],
      ["المصاريف", Number(finance?.expenses ?? 0).toFixed(2)],
      ["مصروفات المساعدين", Number(finance?.assistantSalaries ?? 0).toFixed(2)],
      ["الصافي", Number(finance?.net ?? 0).toFixed(2)],
    ];

    const body = [
      header.join(","),
      summary.map((r) => r.map(csvEscape).join(",")).join("\n"),
      "",
      // A solo center has no per-teacher breakdown.
      ...(isSoloReport
        ? []
        : [
            [csvEscape("بالمدرسون"), csvEscape(`(المحصّل من ${fromYm} إلى ${toYm})`)].join(","),
            tableToCsv(TEACHER_HEADERS, teachers.map(toTeacherRow)),
            "",
          ]),
      [csvEscape("بالمجموعات"), csvEscape(`(شهر الفوترة ${billingYm})`)].join(","),
      tableToCsv(
        isSoloReport ? GROUP_HEADERS_SOLO : GROUP_HEADERS,
        groups.map((g, i) => toGroupRow(g, i, isSoloReport ? soloTeacherSubject : null)),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `تقارير_المركز_${billingYm || "تقرير"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // =========================================================
  // Deep link into the overdue page, filtered by group + month
  // =========================================================
  const overdueLink = (groupId) => {
    const { year, month } = toYearMonth(billingYm);
    const params = new URLSearchParams();
    if (groupId) params.set("groupId", groupId);
    if (month) params.set("month", String(month));
    if (year) params.set("year", String(year));
    return `/overdue?${params.toString()}`;
  };

  // =========================================================
  // Render
  // =========================================================
  return (
    <div className="space-y-6 p-4 md:p-6 dir-rtl" dir="rtl">
      {/* ---------- Header + controls (hidden when printing) ---------- */}
      <div className="no-print flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-main">تقارير المركز</h1>
          <p className="text-sm text-text-muted">
            أرقام المركز كاملة: الإجماليات، القيود المالية، المدرسون والمجموعات.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!data}
            className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm font-semibold text-text-main transition hover:bg-surface-muted disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            تصدير CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!data}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            طباعة
          </button>
        </div>
      </div>

      {/* ---------- Filters ---------- */}
      <div className="no-print rounded-xl border border-surface-border bg-surface-card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-text-muted">
            من شهر
            <input
              type="month"
              value={fromYm}
              onChange={(e) => setFromYm(e.target.value)}
              className="rounded-lg border border-surface-border bg-surface-bg px-3 py-2 text-sm text-text-main"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-text-muted">
            إلى شهر
            <input
              type="month"
              value={toYm}
              onChange={(e) => setToYm(e.target.value)}
              className="rounded-lg border border-surface-border bg-surface-bg px-3 py-2 text-sm text-text-main"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-text-muted lg:col-span-2">
            شهر الفوترة (المتوقع والمتبقي)
            <input
              type="month"
              value={billingYm}
              onChange={(e) => setBillingYm(e.target.value)}
              className="rounded-lg border border-surface-border bg-surface-bg px-3 py-2 text-sm text-text-main"
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-text-muted">
          «المحصّل في الفترة» ونسب الحضور تُحتسب من <b>{fromYm || "—"}</b> إلى{" "}
          <b>{toYm || "—"}</b>، أمّا «المتوقع / المتبقي للشهر» فتُحتسب لشهر الفوترة{" "}
          <b>{billingYm || "—"}</b>.
        </p>
      </div>

      {/* ---------- Loading ---------- */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-text-muted">جارٍ تحميل التقرير…</p>
        </div>
      )}

      {/* ---------- Error ---------- */}
      {!loading && error && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-surface-border bg-surface-card py-16">
          <AlertTriangle className="h-10 w-10 text-status-danger" />
          <p className="text-sm font-semibold text-text-main">تعذّر تحميل التقرير</p>
          <p className="text-xs text-text-muted">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-1 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* ---------- Content ---------- */}
      {!loading && !error && data && (
        <div className="space-y-6 print-area">
          {/* Totals */}
          <section>
            <h2 className="mb-3 text-base font-bold text-text-main">الإجماليات</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "الطلاب النشطون", value: totals?.activeStudents ?? 0 },
                { label: "المدرسون", value: totals?.teachers ?? 0 },
                { label: "المساعدون", value: totals?.assistants ?? 0 },
                { label: "المجموعات", value: totals?.groups ?? 0 },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-surface-border bg-surface-card p-4"
                >
                  <p className="text-xs text-text-muted">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-text-main">{card.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Finance */}
          <section>
            <h2 className="mb-3 text-base font-bold text-text-main">
              القيود المالية للفترة
            </h2>
            <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
              <dl className="divide-y divide-surface-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-sm text-text-muted">مدفوعات الطلاب المحصّلة</dt>
                  <dd className="text-sm font-bold text-text-main">
                    {formatCurrency(finance?.studentPaymentsCollected ?? 0)}
                  </dd>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-sm text-text-muted">إيرادات أخرى</dt>
                  <dd className="text-sm font-bold text-text-main">
                    {formatCurrency(finance?.otherIncomes ?? 0)}
                  </dd>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-sm text-text-muted">المصاريف</dt>
                  <dd className="text-sm font-bold text-text-main">
                    {formatCurrency(finance?.expenses ?? 0)}
                  </dd>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-sm text-text-muted">مصروفات المساعدين</dt>
                  <dd className="text-sm font-bold text-text-main">
                    {formatCurrency(finance?.assistantSalaries ?? 0)}
                  </dd>
                </div>
                <div className="flex items-center justify-between bg-surface-muted px-4 py-3">
                  <dt className="text-sm font-semibold text-text-main">الصافي</dt>
                  <dd className="text-base font-bold text-status-success">
                    {formatCurrency(finance?.net ?? 0)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Trend */}
          {showAccounting && (
          <section>
            <h2 className="mb-3 text-base font-bold text-text-main">
              الإيرادات مقابل المصروفات (آخر 6 أشهر)
            </h2>
            <div className="rounded-xl border border-surface-border bg-surface-card p-4">
              {trendData.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-text-muted">
                  <AlertTriangle className="h-8 w-8" />
                  <p className="text-sm">لا توجد بيانات للفترة المحددة</p>
                </div>
              ) : (
                <div className="h-72" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={trendData}
                      margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke="var(--color-surface-border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--color-surface-muted)", opacity: 0.4 }}
                        contentStyle={{
                          direction: "rtl",
                          borderRadius: "12px",
                          border: "1px solid var(--color-surface-border)",
                          background: "var(--color-surface-card)",
                          color: "var(--color-text-main)",
                        }}
                        formatter={(value, name) => [formatCurrency(value), name]}
                      />
                      <Legend
                        formatter={(value) => (
                          <span className="text-xs text-text-muted">{value}</span>
                        )}
                      />
                      <Bar
                        dataKey="income"
                        name="الإيرادات"
                        fill="var(--color-primary)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={34}
                      />
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        name="المصروفات"
                        stroke="var(--color-status-warning)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>
          )}

          {/* Teachers — hidden for a solo center (single teacher, no breakdown) */}
          {!isSoloReport && (
          <section>
            <h2 className="mb-3 text-base font-bold text-text-main">بالمدرسون</h2>
            <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface-card">
              {teachers.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-14 text-text-muted">
                  <AlertTriangle className="h-9 w-9" />
                  <p className="text-sm">لا يوجد مدرّسون في المركز</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-muted text-xs text-text-muted">
                      <th className="px-3 py-3 text-right font-semibold">#</th>
                      <th className="px-3 py-3 text-right font-semibold">المدرس</th>
                      <th className="px-3 py-3 text-right font-semibold">المجموعات</th>
                      <th className="px-3 py-3 text-right font-semibold">الطلاب</th>
                      {showPayments && (
                        <th className="px-3 py-3 text-right font-semibold">
                          المحصّل في الفترة
                        </th>
                      )}
                      {showAttendance && (
                        <th className="px-3 py-3 text-right font-semibold">نسبة الحضور</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {teachers.map((t, i) => (
                      <tr key={t.teacherId} className="hover:bg-surface-muted">
                        <td className="px-3 py-3 text-text-muted">{i + 1}</td>
                        <td className="px-3 py-3 font-semibold text-text-main">
                          {t.teacherName}
                        </td>
                        <td className="px-3 py-3 text-text-main">{t.groupsCount}</td>
                        <td className="px-3 py-3 text-text-main">{t.studentsCount}</td>
                        {showPayments && (
                          <td className="px-3 py-3 font-bold text-text-main">
                            {formatCurrency(t.collectedInRange)}
                          </td>
                        )}
                        {showAttendance && (
                          <td className="px-3 py-3 text-text-main">
                            {Number(t.attendanceRate).toFixed(2)}%
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
          )}

          {/* Groups */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-text-main">بالمجموعات</h2>
              <span className="text-xs text-text-muted">
                شهر الفوترة: {billingYm || "—"}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface-card">
              {groups.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-14 text-text-muted">
                  <AlertTriangle className="h-9 w-9" />
                  <p className="text-sm">لا توجد مجموعات في المركز</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-muted text-xs text-text-muted">
                      <th className="px-3 py-3 text-right font-semibold">#</th>
                      <th className="px-3 py-3 text-right font-semibold">المجموعة</th>
                      <th className="px-3 py-3 text-right font-semibold">
                        {isSoloReport ? "المادة" : "المدرس"}
                      </th>
                      <th className="px-3 py-3 text-right font-semibold">الطلاب</th>
                      {showAttendance && (
                        <th className="px-3 py-3 text-right font-semibold">نسبة الحضور</th>
                      )}
                      {showPayments && (
                        <>
                          <th className="px-3 py-3 text-right font-semibold">المتوقع للشهر</th>
                          <th className="px-3 py-3 text-right font-semibold">المحصّل للشهر</th>
                          <th className="px-3 py-3 text-right font-semibold">المتبقي للشهر</th>
                          <th className="px-3 py-3" />
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {groups.map((g, i) => (
                      <tr key={g.groupId} className="hover:bg-surface-muted">
                        <td className="px-3 py-3 text-text-muted">{i + 1}</td>
                        <td className="px-3 py-3 font-semibold text-text-main">
                          {g.groupName}
                        </td>
                        <td className="px-3 py-3 text-text-main">
                          {isSoloReport ? (soloTeacherSubject || "—") : (g.teacherName || "—")}
                        </td>
                        <td className="px-3 py-3 text-text-main">{g.studentsCount}</td>
                        {showAttendance && (
                          <td className="px-3 py-3 text-text-main">
                            {Number(g.attendanceRate).toFixed(2)}%
                          </td>
                        )}
                        {showPayments && (
                          <>
                            <td className="px-3 py-3 text-text-main">
                              {formatCurrency(g.expected)}
                            </td>
                            <td className="px-3 py-3 text-text-main">
                              {formatCurrency(g.collected)}
                            </td>
                            <td className="px-3 py-3 font-bold text-status-danger">
                              {formatCurrency(g.outstanding)}
                            </td>
                            <td className="no-print px-3 py-3">
                              {Number(g.outstanding) > 0 && (
                                <Link
                                  to={overdueLink(g.groupId)}
                                  className="rounded-lg border border-surface-border px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-surface-muted"
                                >
                                  عرض المتأخرين
                                </Link>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-surface-border bg-surface-muted text-xs font-bold">
                      <td className="px-3 py-3" colSpan={4 + (showAttendance ? 1 : 0)}>
                        الإجمالي (كل المجموعات)
                      </td>
                      {showPayments && (
                        <>
                          <td className="px-3 py-3 text-text-main">
                            {formatCurrency(
                              groups.reduce((s, g) => s + Number(g.expected || 0), 0),
                            )}
                          </td>
                          <td className="px-3 py-3 text-text-main">
                            {formatCurrency(
                              groups.reduce((s, g) => s + Number(g.collected || 0), 0),
                            )}
                          </td>
                          <td className="px-3 py-3 text-status-danger">
                            {formatCurrency(
                              groups.reduce((s, g) => s + Number(g.outstanding || 0), 0),
                            )}
                          </td>
                          <td className="no-print" />
                        </>
                      )}
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {showPayments && (
              <p className="mt-3 text-xs text-text-muted">
                «المتبقي للشهر» هو نفسه رقم متأخّري ذلك الشهر بالضبط —{" "}
                <Link to={overdueLink(null)} className="font-semibold text-primary">
                  فتح صفحة المتأخرين
                </Link>
              </p>
            )}
          </section>
        </div>
      )}

      {/* ---------- Empty ---------- */}
      {!loading && !error && !data && (
        <div className="flex flex-col items-center gap-3 py-24 text-text-muted">
          <AlertTriangle className="h-10 w-10" />
          <p className="text-sm font-semibold">لا توجد بيانات لعرضها</p>
        </div>
      )}
    </div>
  );
}
