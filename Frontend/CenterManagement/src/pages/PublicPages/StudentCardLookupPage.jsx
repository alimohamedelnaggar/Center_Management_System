import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Award,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Loader2,
  Percent,
  QrCode,
  School,
  Search,
  TriangleAlert,
  UserRound,
} from "@/components/icons";
import { studentsService } from "../../services/studentService";
import {
  buildStudentCardUrl,
  extractStudentCode,
  isStudentCode,
  toQrDataUrl,
} from "../../utils/qrCode";

const STATUS_STYLES = {
  Present: "bg-status-success-bg text-status-success border-status-success/20",
  Absent: "bg-status-danger-bg text-status-danger border-status-danger/20",
  Late: "bg-status-warning-bg text-status-warning border-status-warning/20",
  Excused: "bg-slate-100 text-slate-600 border-slate-200",
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value).slice(0, 10)
    : date.toLocaleDateString("en-GB");
};

export default function StudentCardLookupPage() {
  const { code: routeCode } = useParams();
  const [code, setCode] = useState(extractStudentCode(routeCode ?? ""));
  const [inputCode, setInputCode] = useState(extractStudentCode(routeCode ?? ""));
  const [card, setCard] = useState(null);
  const [qrImage, setQrImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCard = useCallback(async (value) => {
    const normalized = extractStudentCode(value);

    if (!normalized) {
      setError("اكتب كود الطالب عشان تشوف الكارت.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await studentsService.getStudentCard(normalized);

      if (result?.succeeded && result.data) {
        setCard(result.data);
        setCode(normalized);
      } else {
        setCard(null);
        setError(result?.message || "مفيش طالب بالكود ده.");
      }
    } catch (err) {
      setCard(null);
      setError(
        err.response?.data?.message || "مش قادرين نحمّل بيانات الطالب دلوقتي.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (routeCode) loadCard(routeCode);
  }, [routeCode, loadCard]);

  useEffect(() => {
    if (!card?.qrCode) {
      setQrImage("");
      return undefined;
    }

    let active = true;

    toQrDataUrl(buildStudentCardUrl(card.qrCode), { size: 260 })
      .then((url) => {
        if (active) setQrImage(url);
      })
      .catch(() => setQrImage(""));

    return () => {
      active = false;
    };
  }, [card]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const value = extractStudentCode(inputCode);

    if (!value) {
      toast.error("اكتب كود الطالب");
      return;
    }

    loadCard(value);
  };

  const summary = card?.summary;
  const attendances = card?.attendances ?? [];
  const exams = card?.exams ?? [];

  return (
    <div className="dir-rtl min-h-screen bg-slate-100">
      <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between rounded-2xl bg-primary px-5 py-4 text-white shadow-sm">
          <div>
            <h1 className="text-base font-bold">كارت الطالب</h1>
            <p className="mt-0.5 text-[11px] opacity-90">
              متابعة الحضور والغياب ودرجات الامتحانات
            </p>
          </div>
          <QrCode className="h-7 w-7 opacity-90" />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-3 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={inputCode}
              onChange={(event) => setInputCode(event.target.value)}
              placeholder="STU00000001"
              dir="ltr"
              className="w-full rounded-xl border border-surface-border bg-surface-card py-2 pl-4 pr-10 text-center font-mono text-sm tracking-widest text-text-main outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "جاري التحميل..." : "عرض الكارت"}
          </button>
        </form>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-surface-border bg-surface-card px-6 py-14 text-center">
            <TriangleAlert className="h-8 w-8 text-status-warning" />
            <p className="text-xs font-semibold text-text-main">{error}</p>
          </div>
        )}

        {!loading && card && (
          <>
            <div className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-lg font-bold text-text-main">
                  {card.fullName}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {card.groupName || "بدون مجموعة"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  {card.school && (
                    <span className="flex items-center gap-1 rounded-lg bg-surface-muted px-2 py-1 font-semibold text-text-muted">
                      <School className="h-3.5 w-3.5" />
                      {card.school}
                    </span>
                  )}
                  <span className="flex items-center gap-1 rounded-lg bg-surface-muted px-2 py-1 font-semibold text-text-muted">
                    <UserRound className="h-3.5 w-3.5" />
                    {card.subscriptionType}
                  </span>
                  {card.parentPhone && (
                    <span className="flex items-center gap-1 rounded-lg bg-surface-muted px-2 py-1 font-semibold text-text-muted">
                      ولي الأمر
                      <span dir="ltr">{card.parentPhone}</span>
                    </span>
                  )}
                  <span
                    dir="ltr"
                    className="rounded-lg bg-surface-muted px-2 py-1 font-mono font-bold text-text-muted"
                  >
                    {card.qrCode}
                  </span>
                </div>
              </div>

              {qrImage && (
                <img
                  src={qrImage}
                  alt={card.qrCode}
                  className="h-28 w-28 shrink-0 self-center rounded-xl border border-surface-border bg-white p-1"
                />
              )}
            </div>

            {summary && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  icon={CalendarCheck}
                  label="حصص مسجلة"
                  value={summary.totalSessions ?? 0}
                  tone="slate"
                />
                <StatCard
                  icon={CalendarCheck}
                  label="حضور"
                  value={summary.presentSessions ?? 0}
                  tone="success"
                />
                <StatCard
                  icon={CalendarCheck}
                  label="غياب"
                  value={summary.absentSessions ?? 0}
                  tone="danger"
                />
                <StatCard
                  icon={Percent}
                  label="نسبة الحضور"
                  value={`${summary.attendanceRate ?? 0}%`}
                  tone="primary"
                />
              </div>
            )}

            <section className="space-y-3 rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-text-main">
                  سجل الحضور والغياب
                </h2>
                <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-text-muted">
                  {attendances.length}
                </span>
              </div>

              {attendances.length === 0 ? (
                <p className="py-6 text-center text-xs text-text-muted">
                  مفيش حصص متسجلة لسه.
                </p>
              ) : (
                <ul className="space-y-2">
                  {attendances.map((item, index) => (
                    <li
                      key={`${item.sessionId}-${item.attendanceDate}-${index}`}
                      className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-text-main">
                          {item.groupName || "حصة"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-text-muted">
                          {item.dayName} • {item.startTime} - {item.endTime} •{" "}
                          {formatDate(item.attendanceDate)}
                        </p>
                      </div>

                      <span
                        className={`self-start rounded-lg border px-2.5 py-1 text-[10px] font-bold sm:self-auto ${
                          STATUS_STYLES[item.status] ?? STATUS_STYLES.Excused
                        }`}
                      >
                        {item.statusLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-text-main">
                  درجات الامتحانات
                </h2>
                <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-text-muted">
                  {exams.length}
                </span>
              </div>

              {exams.length === 0 ? (
                <p className="py-6 text-center text-xs text-text-muted">
                  مفيش درجات متسجلة لسه.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {exams.map((exam) => (
                    <li
                      key={exam.examId}
                      className="rounded-xl border border-surface-border bg-surface-card p-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-text-main">
                            {exam.examName}
                          </p>
                          <p className="mt-0.5 text-[10px] text-text-muted">
                            {formatDate(exam.examDate)}
                            {exam.groupName ? ` • ${exam.groupName}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {exam.isAbsent && (
                            <span className="rounded-lg border border-status-danger/20 bg-status-danger-bg px-2 py-0.5 text-[10px] font-bold text-status-danger">
                              غائب
                            </span>
                          )}
                          {exam.isLowGrade && (
                            <span className="flex items-center gap-1 rounded-lg border border-status-warning/20 bg-status-warning-bg px-2 py-0.5 text-[10px] font-bold text-status-warning">
                              <TriangleAlert className="h-3 w-3" />
                              درجة منخفضة
                            </span>
                          )}
                          <span className="rounded-lg bg-primary-subtle px-2 py-0.5 text-[10px] font-bold text-primary">
                            {exam.percentage}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                        {exam.components.map((component, index) => (
                          <div
                            key={`${exam.examId}-${index}`}
                            className="flex items-center justify-between rounded-lg bg-surface-muted px-2.5 py-1.5"
                          >
                            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-text-muted">
                              <BookOpen className="h-3 w-3" />
                              {component.typeLabel}
                            </span>
                            <span
                              dir="ltr"
                              className="text-[10px] font-bold text-text-main"
                            >
                              {component.isAbsent
                                ? "غائب"
                                : `${component.mark} / ${component.totalMark}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {!loading && !card && !error && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-surface-border bg-surface-card px-6 py-16 text-center">
            <Award className="h-8 w-8 text-text-muted/60" />
            <p className="text-xs text-text-muted">
              امسح كارت الطالب أو اكتب الكود اللي تحت الكارت.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    success: "bg-status-success-bg text-status-success",
    danger: "bg-status-danger-bg text-status-danger",
    primary: "bg-primary-subtle text-primary",
  };

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-4 text-center shadow-sm">
      <div
        className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-lg font-bold text-text-main">{value}</p>
      <p className="text-[10px] font-semibold text-text-muted">{label}</p>
    </div>
  );
}
