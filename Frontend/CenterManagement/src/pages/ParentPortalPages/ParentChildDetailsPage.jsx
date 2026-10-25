import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CalendarCheck,
  ChevronLeft,
  ClipboardList,
  GraduationCap,
  Loader2,
  RefreshCw,
  Star,
  TriangleAlert,
  UserRound,
  Wallet,
} from "@/components/icons";
import ModuleGuard from "../../components/common/ModuleGuard";
import { MODULES } from "../../constants/modules";
import { parentPortalService } from "../../services/parentPortalService";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatShortDate } from "../../utils/months";

/**
 * Per-child detail page of the parent portal. The whole portal is already gated
 * by `parent_portal` (ParentPortalGate); every section below is additionally
 * gated by its own module, exactly mirroring the backend endpoints:
 *   attendance  → /Children/{id}/Attendance
 *   grades      → /Children/{id}/Grades
 *   online exams→ /Children/{id}/Exams
 *   payments    → /Children/{id}/Payments
 *
 * A section whose module is off renders the shared `ModuleLocked` card (and is
 * never requested). A child the parent is not linked to (or deleted) yields a
 * 404 from the summary endpoint → the "unavailable" screen, not a blank page.
 */

const SECTIONS = [
  {
    key: "attendance",
    title: "الحضور والغياب",
    moduleKey: MODULES.ATTENDANCE,
    icon: CalendarCheck,
  },
  {
    key: "grades",
    title: "الدرجات",
    moduleKey: MODULES.GRADES,
    icon: Star,
  },
  {
    key: "exams",
    title: "نتائج الاختبارات الإلكترونية",
    moduleKey: MODULES.ONLINE_EXAMS,
    icon: ClipboardList,
  },
  {
    key: "payments",
    title: "المدفوعات",
    moduleKey: MODULES.PAYMENTS,
    icon: Wallet,
  },
];

function statusClasses(statusName) {
  switch (statusName) {
    case "حاضر":
      return "bg-status-success-bg text-status-success";
    case "غائب":
      return "bg-status-danger-bg text-status-danger";
    case "متأخر":
      return "bg-status-warning-bg text-status-warning";
    case "بعذر":
      return "bg-status-info-bg text-status-info";
    default:
      return "bg-surface-muted text-text-muted";
  }
}

function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
      <Loader2 className="h-4 w-4 animate-spin" />
      جاري التحميل...
    </div>
  );
}

function SectionError({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-status-danger-bg text-status-danger">
        <TriangleAlert className="h-5 w-5" />
      </div>
      <p className="text-sm text-text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs font-medium text-text-main transition hover:bg-surface-muted"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        إعادة المحاولة
      </button>
    </div>
  );
}

function Empty({ text }) {
  return (
    <p className="py-10 text-center text-sm text-text-muted">{text}</p>
  );
}

/**
 * One gated section: rendered only when its module is enabled, otherwise the
 * locked card. Data is fetched lazily once the section is visible.
 */
export function ChildSection({
  title,
  moduleKey,
  icon: Icon,
  studentId,
  load,
  isEmpty,
  emptyText,
  children,
}) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  const fetchData = useCallback(async () => {
    setState({ loading: true, error: null, data: null });
    try {
      const res = await load(studentId);
      if (res?.succeeded) {
        setState({ loading: false, error: null, data: res.data });
      } else {
        setState({
          loading: false,
          error: res?.message || "تعذّر تحميل البيانات",
          data: null,
        });
      }
    } catch (err) {
      setState({
        loading: false,
        error: err?.response?.data?.message || "تعذّر تحميل البيانات",
        data: null,
      });
    }
  }, [load, studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <ModuleGuard moduleKey={moduleKey}>
      <section className="rounded-xl border border-surface-border bg-surface-card shadow-sm">
        <header className="flex items-center gap-2.5 border-b border-surface-border px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-text-main">{title}</h2>
        </header>

        <div className="px-4 py-2">
          {state.loading && <Loading />}
          {!state.loading && state.error && (
            <SectionError message={state.error} onRetry={fetchData} />
          )}
          {!state.loading && !state.error && state.data && (
            isEmpty(state.data) ? (
              <Empty text={emptyText} />
            ) : (
              children(state.data)
            )
          )}
        </div>
      </section>
    </ModuleGuard>
  );
}

const isEmptyAttendance = (d) => !d?.records?.length;
const isEmptyGrades = (d) => !d?.exams?.length;
const isEmptyExams = (d) => !d?.exams?.length;
const isEmptyPayments = (d) => !d?.payments?.length;

function AttendanceBody({ data }) {
  const rtlLabel = (x) => (x ? String(x) : "—");

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 py-3 sm:grid-cols-4">
        <Stat label="إجمالي الحصص" value={data.totalSessions} />
        <Stat label="حاضر" value={data.presentCount} tone="success" />
        <Stat label="غائب" value={data.absentCount} tone="danger" />
        <Stat label="نسبة الحضور" value={`${data.attendancePercentage}%`} />
      </div>

      <ul className="divide-y divide-surface-border">
        {data.records.map((record, index) => (
          <li
            key={`${record.attendanceDate}-${index}`}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-main">
                {formatShortDate(record.attendanceDate) || "—"}
              </p>
              <p className="truncate text-xs text-text-muted">
                {record.groupName}
                {record.dayOfWeek ? ` · ${record.dayOfWeek}` : ""}
                {record.startTime ? ` · ${record.startTime} - ${record.endTime}` : ""}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses(
                record.statusName,
              )}`}
            >
              {rtlLabel(record.statusName)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GradesBody({ data }) {
  return (
    <ul className="divide-y divide-surface-border">
      {data.exams.map((exam, index) => (
        <li key={`${exam.examName}-${index}`} className="py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-text-main">{exam.examName}</p>
            <span className="shrink-0 text-xs text-text-muted">
              {formatShortDate(exam.examDate) || ""}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {exam.components.map((component, cIndex) => (
              <span
                key={`${component.componentName}-${cIndex}`}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs ${
                  component.isAbsent
                    ? "border-status-danger-bg bg-status-danger-bg text-status-danger"
                    : "border-surface-border bg-surface-muted text-text-main"
                }`}
              >
                <span className="text-text-muted">{component.componentName}:</span>
                <span className="font-bold">
                  {component.isAbsent ? "غائب" : component.mark}
                </span>
                {!component.isAbsent && (
                  <span className="text-text-muted">/ {component.totalMarks}</span>
                )}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ExamsBody({ data }) {
  return (
    <ul className="divide-y divide-surface-border">
      {data.exams.map((exam, index) => (
        <li
          key={`${exam.examName}-${index}`}
          className="flex items-center justify-between gap-3 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-main">
              {exam.examName}
            </p>
            <p className="text-xs text-text-muted">
              {formatShortDate(exam.submittedAt) || "—"}
              {exam.hasPendingManualGrading ? " · بانتظار التصحيح" : ""}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary-subtle px-3 py-1 text-xs font-bold text-primary">
            {exam.score} / {exam.totalMark}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PaymentsBody({ data }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 py-3">
        <Stat label="المدفوع" value={formatCurrency(data.totalPaid)} tone="success" />
        <Stat
          label="المتبقي"
          value={formatCurrency(data.totalDue)}
          tone={data.totalDue > 0 ? "danger" : "success"}
        />
      </div>

      <ul className="divide-y divide-surface-border">
        {data.payments.map((payment, index) => (
          <li
            key={`${payment.paymentDate}-${index}`}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-main">
                {payment.groupName}
              </p>
              <p className="text-xs text-text-muted">
                {formatShortDate(payment.paymentDate) || "—"}
                {payment.billingPeriod
                  ? ` · ${formatShortDate(payment.billingPeriod)}`
                  : ""}
              </p>
            </div>
            <div className="shrink-0 text-left">
              <p className="text-sm font-bold text-text-main">
                {formatCurrency(payment.paidAmount)}
              </p>
              {payment.remainingAmount > 0 && (
                <p className="text-xs text-status-danger">
                  متبقي {formatCurrency(payment.remainingAmount)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const toneClass =
    tone === "success"
      ? "text-status-success"
      : tone === "danger"
        ? "text-status-danger"
        : "text-text-main";

  return (
    <div className="rounded-lg border border-surface-border bg-surface-muted px-3 py-2 text-center">
      <p className={`text-base font-bold ${toneClass}`}>{value}</p>
      <p className="mt-0.5 text-xs text-text-muted">{label}</p>
    </div>
  );
}

export default function ParentChildDetailsPage() {
  const { studentId } = useParams();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnavailable(false);
    try {
      const res = await parentPortalService.getChildSummary(studentId);
      if (res?.succeeded) {
        setSummary(res.data);
      } else if (res?.statusCode === 404 || res?.statusCode === "404") {
        setUnavailable(true);
      } else {
        setError(res?.message || "تعذّر تحميل بيانات الطالب");
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        setUnavailable(true);
      } else {
        setError(
          err?.response?.data?.message || "تعذّر تحميل بيانات الطالب",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const backLink = (
    <Link
      to="/parent/dashboard"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition hover:text-text-main"
    >
      <ChevronLeft className="h-4 w-4" />
      أبنائي
    </Link>
  );

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        {backLink}
        <Loading />
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="p-4 md:p-6">
        {backLink}
        <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-surface-border bg-surface-card py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-status-warning-bg text-status-warning">
            <TriangleAlert className="h-7 w-7" />
          </div>
          <p className="text-sm font-bold text-text-main">هذا الطالب غير مرتبط بحسابك</p>
          <p className="max-w-sm text-xs text-text-muted">
            ربما تم إلغاء الربط أو حذف الطالب. تواصل مع إدارة المركز.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        {backLink}
        <div className="mt-4 rounded-xl border border-surface-border bg-surface-card">
          <SectionError message={error} onRetry={loadSummary} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 font-sans md:p-6">
      {backLink}

      <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
          <UserRound className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-text-main">
            {summary?.fullName}
          </h1>
          <span
            className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              summary?.isActive
                ? "bg-status-success-bg text-status-success"
                : "bg-status-danger-bg text-status-danger"
            }`}
          >
            {summary?.isActive ? "نشط" : "غير نشط"}
          </span>
        </div>
        <GraduationCap className="hidden h-8 w-8 shrink-0 text-text-muted sm:block" />
      </div>

      {SECTIONS.map((section) => (
        <ChildSection
          key={section.key}
          title={section.title}
          moduleKey={section.moduleKey}
          icon={section.icon}
          studentId={studentId}
          load={
            section.key === "attendance"
              ? parentPortalService.getChildAttendance
              : section.key === "grades"
                ? parentPortalService.getChildGrades
                : section.key === "exams"
                  ? parentPortalService.getChildExams
                  : parentPortalService.getChildPayments
          }
          isEmpty={
            section.key === "attendance"
              ? isEmptyAttendance
              : section.key === "grades"
                ? isEmptyGrades
                : section.key === "exams"
                  ? isEmptyExams
                  : isEmptyPayments
          }
          emptyText={
            section.key === "attendance"
              ? "لا توجد سجلات حضور بعد"
              : section.key === "grades"
                ? "لا توجد درجات منشورة بعد"
                : section.key === "exams"
                  ? "لا توجد نتائج اختبارات منشورة بعد"
                  : "لا توجد مدفوعات مسجلة"
          }
        >
          {section.key === "attendance" ? (
            (data) => <AttendanceBody data={data} />
          ) : section.key === "grades" ? (
            (data) => <GradesBody data={data} />
          ) : section.key === "exams" ? (
            (data) => <ExamsBody data={data} />
          ) : (
            (data) => <PaymentsBody data={data} />
          )}
        </ChildSection>
      ))}
    </div>
  );
}
