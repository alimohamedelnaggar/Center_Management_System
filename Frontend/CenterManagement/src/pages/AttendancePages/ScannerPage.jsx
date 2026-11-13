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
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import { attendanceService } from "../../services/attendanceService";
import { extractStudentCode } from "../../utils/qrCode";
import {
  buildScanErrorOutcome,
  outcomeFromApiResponse,
  SCAN_OUTCOME_LABELS,
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
      const message =
        "لا توجد حصة جارية الآن. انتظر بداية الحصة أو اختر الحصة يدويًا.";

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

      const outcome = outcomeFromApiResponse(result, { code });

      if (result?.succeeded) {
        const data = result.data ?? {};

        addLog({
          type: "success",
          statusLabel: SCAN_OUTCOME_LABELS[outcome.status],
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
          message: result?.message || "هذا الكود غير صالح.",
        });

        toast.error(result?.message || "هذا الكود غير صالح.");
      }

      return outcome;
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
    <div
      data-testid="scanner-page"
      className="dir-rtl mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6"
    >
      <PageHeader
        title="ماسح الحضور"
        subtitle="مرّر كارت الطالب أمام الكاميرا ليُسجَّل الحضور تلقائيًا في الحصة الجارية."
        actions={
          <Button
            onClick={() => setIsScannerOpen(true)}
            disabled={!selectedSessionId}
            data-testid="scanner-open"
          >
            <ScanLine className="h-4 w-4" aria-hidden="true" />
            {selectedSessionId ? "فتح الكاميرا" : "لا توجد حصة جارية"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader
            title="الحصة الحالية"
            subtitle="اختر التاريخ والحصة الجارية قبل بدء المسح."
          />

          <CardBody className="space-y-4">
            <FormField label="التاريخ" htmlFor="scanner-date">
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  aria-hidden="true"
                />
                <Input
                  id="scanner-date"
                  data-testid="scanner-date"
                  type="date"
                  value={attendanceDate}
                  max={todayString()}
                  onChange={(event) => setAttendanceDate(event.target.value)}
                  className="pe-10"
                />
              </div>
            </FormField>

            <FormField label="الحصة" htmlFor="scanner-session">
              {loadingSessions ? (
                <div
                  data-testid="scanner-session-loading"
                  className="space-y-2 rounded-control border border-surface-border bg-surface-muted p-3"
                >
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : sessions.length === 0 ? (
                <div
                  data-testid="scanner-session-empty"
                  className="flex items-start gap-2 rounded-control border border-dashed border-status-warning/40 bg-status-warning-bg px-3 py-3 text-xs font-semibold leading-relaxed text-status-warning"
                >
                  <TriangleAlert
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>لا توجد حصص جارية الآن.</span>
                </div>
              ) : (
                <div className="relative">
                  <Clock
                    className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                    aria-hidden="true"
                  />
                  <Select
                    id="scanner-session"
                    data-testid="scanner-session"
                    value={selectedSessionId}
                    onChange={(event) => setSelectedSessionId(event.target.value)}
                    className="pe-10"
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
                  </Select>
                </div>
              )}
            </FormField>

            <Button
              variant="secondary"
              size="sm"
              block
              onClick={fetchRunningSessions}
              loading={loadingSessions}
              data-testid="scanner-refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              تحديث الحصص الجارية
            </Button>

            {selectedSession && (
              <div className="space-y-2 rounded-control border border-surface-border bg-surface-muted px-3 py-3">
                <p className="text-sm font-bold text-text-main">
                  {selectedSession.groupName ?? selectedSession.GroupName}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatTime(selectedSession.startTime ?? selectedSession.StartTime)}
                  {" - "}
                  {formatTime(selectedSession.endTime ?? selectedSession.EndTime)}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {selectedSession.studentsCount ??
                    selectedSession.StudentsCount ??
                    0}{" "}
                  طالب مسجل
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div
                data-testid="scanner-stat-accepted"
                className="rounded-control border border-status-success/20 bg-status-success-bg px-3 py-3 text-center"
              >
                <p className="num text-lg font-bold text-status-success">
                  {presentCount}
                </p>
                <p className="text-xs font-semibold text-status-success">
                  مسح مقبول
                </p>
              </div>
              <div
                data-testid="scanner-stat-rejected"
                className="rounded-control border border-status-danger/20 bg-status-danger-bg px-3 py-3 text-center"
              >
                <p className="num text-lg font-bold text-status-danger">
                  {rejectedCount}
                </p>
                <p className="text-xs font-semibold text-status-danger">
                  مسح مرفوض
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="سجل المسح"
            subtitle="آخر 50 عملية مسح على هذه الصفحة."
            action={
              log.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLog([])}
                  data-testid="scanner-log-clear"
                >
                  مسح السجل
                </Button>
              ) : null
            }
          />

          <CardBody>
            {log.length === 0 ? (
              <div data-testid="scanner-log-empty">
                <EmptyState
                  icon={ScanLine}
                  title="لا توجد عمليات مسح بعد"
                  description="افتح الكاميرا وقرّب كارت الطالب، وستظهر كل عملية هنا فورًا."
                />
              </div>
            ) : (
              <ul
                data-testid="scanner-log"
                className="max-h-[28rem] space-y-2 overflow-y-auto pe-1"
              >
                {log.map((item) => (
                  <li
                    key={item.id}
                    data-testid={`scanner-log-${item.id}`}
                    className={`flex items-start gap-3 rounded-control border px-3 py-2.5 ${
                      item.type === "success"
                        ? "border-status-success/20 bg-status-success-bg/50"
                        : "border-status-danger/20 bg-status-danger-bg/50"
                    }`}
                  >
                    {item.type === "success" ? (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-status-success"
                        aria-hidden="true"
                      />
                    ) : (
                      <TriangleAlert
                        className="mt-0.5 h-4 w-4 shrink-0 text-status-danger"
                        aria-hidden="true"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="truncate text-xs font-bold text-text-main">
                            {item.name}
                          </p>
                          {item.statusLabel && (
                            <span className="shrink-0 rounded-md bg-surface-card px-1.5 py-0.5 text-[10px] font-bold text-text-muted">
                              {item.statusLabel}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] text-text-muted">
                          {item.at.toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-text-muted">
                        {item.message}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-text-muted/80">
                        {item.code}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetect={handleDetect}
        isBusy={isScanning}
        scanDisabled={!selectedSessionId}
        scanDisabledReason="اختر الحصة الجارية قبل بدء المسح."
      />
    </div>
  );
}
