import { useEffect, useState } from "react";
import {
  CalendarCheck,
  CalendarX,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "@/components/icons";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import {
  PortalEmpty,
  PortalLoading,
  PortalStat,
  PortalStatus,
} from "../../components/portal/PortalUI";
import { studentPortalService } from "../../services/studentPortalService";
import { formatAttendanceRate } from "../../utils/attendance";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "-";
  }
}

const STATUS_TONES = {
  1: "success",
  2: "danger",
  3: "warning",
  4: "info",
};

export default function StudentAttendancePage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const res = await studentPortalService.getAttendance();
      if (res?.succeeded) {
        setSummary(res.data);
      } else {
        toast.error(res?.message ?? "فشل في تحميل الحضور");
      }
    } catch {
      toast.error("فشل في تحميل الحضور");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const cards = [
    {
      key: "total",
      label: "إجمالي الحصص",
      value: summary?.totalSessions ?? 0,
      icon: CalendarCheck,
      tone: "primary",
    },
    {
      key: "present",
      label: "حاضر",
      value: summary?.presentCount ?? 0,
      icon: CalendarCheck,
      tone: "success",
    },
    {
      key: "absent",
      label: "غائب",
      value: summary?.absentCount ?? 0,
      icon: CalendarX,
      tone: "danger",
    },
    {
      key: "late",
      label: "متأخر",
      value: summary?.lateCount ?? 0,
      icon: Clock,
      tone: "warning",
    },
    {
      key: "excused",
      label: "بعذر",
      value: summary?.excusedCount ?? 0,
      icon: ShieldCheck,
      tone: "info",
    },
  ];

  const hasAttendanceRate =
    summary?.attendancePercentage !== null &&
    summary?.attendancePercentage !== undefined;
  const attendanceRateValue = hasAttendanceRate
    ? Math.min(Math.max(Number(summary.attendancePercentage) || 0, 0), 100)
    : 0;
  const records = summary?.records ?? [];

  return (
    <div data-testid="student-attendance-page" className="p-4 font-sans md:p-6">
      <PageHeader
        className="mb-5"
        title="الحضور والغياب"
        subtitle="سجل حضورك في حصص المجموعات"
        actions={
          <Button variant="secondary" onClick={loadAttendance} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <PortalStat
            key={card.key}
            label={card.label}
            value={card.value}
            icon={card.icon}
            tone={card.tone}
            testId={`student-attendance-${card.key}`}
          />
        ))}
      </div>

      <div className="mb-5 rounded-card border border-surface-border bg-surface-card p-4 shadow-soft sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="font-bold text-text-main">نسبة الحضور</span>
          <span className="text-base font-extrabold tabular-nums text-primary">
            {formatAttendanceRate(summary?.attendancePercentage)}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-status-success transition-all"
            style={{ width: `${attendanceRateValue}%` }}
          />
        </div>
      </div>

      {loading && <PortalLoading icon={Loader2} />}

      {!loading && records.length === 0 && (
        <PortalEmpty icon={CalendarX} title="لا توجد سجلات حضور بعد." />
      )}

      {!loading && records.length > 0 && (
        <>
          <div className="grid gap-3 lg:hidden">
            {records.map((record, idx) => (
              <article
                key={`${record.attendanceDate}-${idx}`}
                data-testid="student-attendance-card"
                className="rounded-card border border-surface-border bg-surface-card p-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-text-main">
                      {formatDate(record.attendanceDate)}
                    </p>
                    <p className="mt-1 break-words text-sm text-text-muted">
                      {record.groupName}
                    </p>
                  </div>
                  <PortalStatus tone={STATUS_TONES[record.status] ?? "neutral"}>
                    {record.statusName}
                  </PortalStatus>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-surface-border pt-3 text-sm">
                  <div>
                    <dt className="text-xs text-text-muted">اليوم</dt>
                    <dd className="mt-0.5 font-medium text-text-main">
                      {record.dayOfWeek || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">الوقت</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-text-main">
                      {record.startTime && record.endTime
                        ? `${record.startTime} - ${record.endTime}`
                        : "-"}
                    </dd>
                  </div>
                </dl>

                {record.notes && (
                  <p className="mt-3 rounded-control bg-surface-muted px-3 py-2 text-sm leading-6 text-text-muted">
                    {record.notes}
                  </p>
                )}
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-soft lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted text-sm text-text-muted">
                    <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                    <th className="px-4 py-3 text-right font-medium">المجموعة</th>
                    <th className="px-4 py-3 text-right font-medium">اليوم</th>
                    <th className="px-4 py-3 text-right font-medium">الوقت</th>
                    <th className="px-4 py-3 text-right font-medium">الحالة</th>
                    <th className="px-4 py-3 text-right font-medium">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, idx) => (
                    <tr
                      key={`${record.attendanceDate}-${idx}`}
                      className="border-b border-surface-border last:border-0 hover:bg-surface-muted/60"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-text-main">
                        {formatDate(record.attendanceDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-main">
                        {record.groupName}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {record.dayOfWeek || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-text-muted">
                        {record.startTime && record.endTime
                          ? `${record.startTime} - ${record.endTime}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <PortalStatus tone={STATUS_TONES[record.status] ?? "neutral"}>
                          {record.statusName}
                        </PortalStatus>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {record.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
