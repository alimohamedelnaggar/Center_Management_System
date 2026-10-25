import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ScanLine,
  TriangleAlert,
  Users,
} from "@/components/icons";
import QrScannerModal from "../../components/common/QrScannerModal";
import { getSessionLabel } from "../../components/getSessionLabel";
import { attendanceService } from "../../services/attendanceService";
import { extractStudentCode } from "../../utils/qrCode";
import {
  buildScanErrorOutcome,
  isLateScan,
  outcomeFromApiResponse,
} from "../../utils/scanOutcome";

const todayString = () => new Date().toISOString().split("T")[0];

const formatTime = (value) => {
  if (!value) return "--:--";

  const raw = String(value);

  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5);

  const date = new Date(raw);

  return Number.isNaN(date.getTime())
    ? raw.slice(0, 5)
    : date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

export default function ScannerPage() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(todayString());
  const [log, setLog] = useState([]);
  const logIdRef = useRef(0);
  const selectedSessionIdRef = useRef("");

  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);

  const selectedSession =
    sessions.find(
      (session) =>
        (session.sessionId ?? session.SessionId) === selectedSessionId,
    ) ?? null;

  const fetchRunningSessions = useCallback(async () => {
    setLoadingSessions(true);

    try {
      const result = await attendanceService.getRunningSessions();
      const data = result?.data ?? [];

      setSessions(data);

      const current = selectedSessionIdRef.current;
      const stillRunning = data.some(
        (session) =>
          (session.sessionId ?? session.SessionId) === current,
      );

      if (!stillRunning && data.length === 1) {
        setSelectedSessionId(data[0].sessionId ?? data[0].SessionId ?? "");
      }
    } catch (error) {
      toast.error("فشل في تحميل الحصص الجارية");
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchRunningSessions();
  }, [fetchRunningSessions]);

  const addLog = (entry) => {
    setLog((prev) =>
      [{ id: ++logIdRef.current, at: new Date(), ...entry }, ...prev].slice(
        0,
        50,
      ),
    );
  };

  const handleDetect = async (scannedText) => {
    const code = extractStudentCode(scannedText);

    if (!selectedSessionId) {
      const message = "مفيش حصة شغالة دلوقتي. استنى بداية الحصة أو اختر الحصة يدوي.";

      toast.error(message);

      return buildScanErrorOutcome(code, message);
    }

    setIsScanning(true);

    try {
      const result = await attendanceService.scanAttendance({
        code,
        sessionId: selectedSessionId,
        attendanceDate,
      });

      if (result?.succeeded) {
        const data = result.data ?? {};

        addLog({
          type: "success",
          name: data.fullName ?? data.FullName ?? "طالب",
          code: data.qrCode ?? data.QrCode ?? code,
          message: result.message,
        });

        toast.success(result.message || "تم تسجيل الحضور");
      } else {
        addLog({
          type: "error",
          name: "رفض المسح",
          code,
          message: result?.message || "الكود ده مش صالح.",
        });

        toast.error(result?.message || "الكود ده مش صالح.");
      }

      return outcomeFromApiResponse(result, {
        code,
        isLate: isLateScan(selectedSession?.startTime),
      });
    } catch (error) {
      const message =
        error.response?.data?.message || "حدث خطأ أثناء تسجيل المسح";

      addLog({ type: "error", name: "خطأ", code, message });

      toast.error(message);

      return buildScanErrorOutcome(code, message);
    } finally {
      setIsScanning(false);
    }
  };

  const presentCount = log.filter((item) => item.type === "success").length;
  const rejectedCount = log.filter((item) => item.type === "error").length;

  return (
    <div className="dir-rtl mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary-subtle p-3 text-primary">
            <ScanLine className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-main">ماسح الحضور</h2>
            <p className="mt-0.5 text-xs text-text-muted">
              وصّل كارت الطالب على الكاميرا والحضور هيتسجل أوتوماتيك للحصة
              الشغالة دلوقتي.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          disabled={!selectedSessionId}
          className="w-full cursor-pointer rounded-xl bg-primary px-6 py-3 text-sm font-bold text-text-inverse shadow-sm transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
        >
          {selectedSessionId ? "فتح الكاميرا" : "مفيش حصة شغالة"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm lg:col-span-1">
          <h3 className="text-sm font-bold text-text-main">الحصة الحالية</h3>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-text-muted">
              <CalendarDays className="h-3.5 w-3.5" />
              التاريخ
            </label>
            <input
              type="date"
              value={attendanceDate}
              max={todayString()}
              onChange={(event) => setAttendanceDate(event.target.value)}
              className="w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2.5 text-xs text-text-main outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-text-muted">
              <Clock className="h-3.5 w-3.5" />
              الحصة
            </label>

            {loadingSessions ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-surface-border py-4 text-xs text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التحميل...
              </div>
            ) : sessions.length === 0 ? (
              <div className="space-y-2 rounded-xl border border-dashed border-surface-border px-3 py-4 text-center">
                <TriangleAlert className="mx-auto h-5 w-5 text-status-warning" />
                <p className="text-[11px] leading-relaxed text-text-muted">
                  مفيش حصص شغالة دلوقتي.
                </p>
              </div>
            ) : (
              <select
                value={selectedSessionId}
                onChange={(event) => setSelectedSessionId(event.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2.5 text-xs text-text-main outline-none focus:border-primary"
              >
                <option value="">اختر الحصة</option>
                {sessions.map((session) => (
                  <option
                    key={session.sessionId ?? session.SessionId}
                    value={session.sessionId ?? session.SessionId}
                  >
                    {session.groupName ?? session.GroupName} |{" "}
                    {getSessionLabel(session)}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={fetchRunningSessions}
              className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-[11px] font-bold text-text-muted transition-colors hover:bg-surface-border hover:text-text-main"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              تحديث الحصص الجارية
            </button>
          </div>

          {selectedSession && (
            <div className="space-y-2 rounded-xl bg-surface-muted p-3">
              <p className="text-xs font-bold text-text-main">
                {selectedSession.groupName ?? selectedSession.GroupName}
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(selectedSession.startTime ?? selectedSession.StartTime)}
                {" - "}
                {formatTime(selectedSession.endTime ?? selectedSession.EndTime)}
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <Users className="h-3.5 w-3.5" />
                {selectedSession.studentsCount ?? selectedSession.StudentsCount ?? 0}{" "}
                طالب مسجل
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-status-success/20 bg-status-success-bg px-3 py-2.5 text-center">
              <p className="text-lg font-bold text-status-success">
                {presentCount}
              </p>
              <p className="text-[10px] font-semibold text-text-muted">مسح مقبول</p>
            </div>
            <div className="rounded-xl border border-status-danger/20 bg-status-danger-bg px-3 py-2.5 text-center">
              <p className="text-lg font-bold text-status-danger">
                {rejectedCount}
              </p>
              <p className="text-[10px] font-semibold text-text-muted">مسح مرفوض</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-main">سجل المسح</h3>
            {log.length > 0 && (
              <button
                type="button"
                onClick={() => setLog([])}
                className="cursor-pointer text-[11px] font-semibold text-text-muted transition-colors hover:text-text-main"
              >
                مسح السجل
              </button>
            )}
          </div>

          {log.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-surface-border py-16 text-center">
              <ScanLine className="h-8 w-8 text-text-muted/60" />
              <p className="text-xs text-text-muted">
                لسه مفيش كروت اتمسحت.
              </p>
            </div>
          ) : (
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto pl-1">
              {log.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${
                    item.type === "success"
                      ? "border-status-success/20 bg-status-success-bg/50"
                      : "border-status-danger/20 bg-status-danger-bg/50"
                  }`}
                >
                  {item.type === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success" />
                  ) : (
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-danger" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-bold text-text-main">
                        {item.name}
                      </p>
                      <span className="shrink-0 text-[10px] text-text-muted">
                        {item.at.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-text-muted">
                      {item.message}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-text-muted/80">
                      {item.code}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetect={handleDetect}
        isBusy={isScanning}
        scanDisabled={!selectedSessionId}
        scanDisabledReason="اختر الحصة الشغالة من صفحة الماسح قبل ما تبدأ المسح."
      />
    </div>
  );
}