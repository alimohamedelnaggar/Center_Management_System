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
import { studentPortalService } from "../../services/studentPortalService";

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

const STATUS_STYLES = {
  1: "bg-status-success-bg text-status-success",
  2: "bg-status-danger-bg text-status-danger",
  3: "bg-status-warning-bg text-status-warning",
  4: "bg-primary-subtle text-primary",
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
      tone: "bg-primary-subtle text-primary",
    },
    {
      key: "present",
      label: "حاضر",
      value: summary?.presentCount ?? 0,
      icon: CalendarCheck,
      tone: "bg-status-success-bg text-status-success",
    },
    {
      key: "absent",
      label: "غائب",
      value: summary?.absentCount ?? 0,
      icon: CalendarX,
      tone: "bg-status-danger-bg text-status-danger",
    },
    {
      key: "late",
      label: "متأخر",
      value: summary?.lateCount ?? 0,
      icon: Clock,
      tone: "bg-status-warning-bg text-status-warning",
    },
    {
      key: "excused",
      label: "بعذر",
      value: summary?.excusedCount ?? 0,
      icon: ShieldCheck,
      tone: "bg-surface-muted text-text-muted",
    },
  ];

  return (
    <div className="p-4 md:p-6 font-sans">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-main">الحضور والغياب</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            سجل حضورك في حصص المجموعات
          </p>
        </div>
        <button
          type="button"
          onClick={loadAttendance}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-text-main transition hover:bg-surface-muted"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm"
            >
              <div
                className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${card.tone}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-text-main">{card.value}</p>
              <p className="mt-0.5 text-xs text-text-muted">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-5 rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-text-main">نسبة الحضور</span>
          <span className="font-bold text-primary">
            {summary?.attendancePercentage ?? 0}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-status-success transition-all"
            style={{ width: `${summary?.attendancePercentage ?? 0}%` }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted text-xs text-text-muted">
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium">المجموعة</th>
                <th className="px-4 py-3 text-right font-medium">اليوم</th>
                <th className="px-4 py-3 text-right font-medium">الوقت</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                summary?.records?.map((record, idx) => (
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
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">
                      {record.startTime && record.endTime
                        ? `${record.startTime} - ${record.endTime}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          STATUS_STYLES[record.status] ??
                          "bg-surface-muted text-text-muted"
                        }`}
                      >
                        {record.statusName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {record.notes || "-"}
                    </td>
                  </tr>
                ))}

              {!loading && !summary?.records?.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-text-muted"
                  >
                    لا توجد سجلات حضور بعد.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-text-muted"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري التحميل...
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
