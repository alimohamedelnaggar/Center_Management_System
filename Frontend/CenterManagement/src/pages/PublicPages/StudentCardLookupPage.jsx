import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Award,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarX,
  Clock,
  GraduationCap,
  Loader2,
  Percent,
  QrCode,
  School,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "@/components/icons";
import { studentsService } from "../../services/studentService";
import { formatAttendanceRate } from "../../utils/attendance";
import { resolveImageUrl } from "../../utils/media";
import {
  buildStudentCardUrl,
  extractStudentCode,
  toQrDataUrl,
} from "../../utils/qrCode";

const STATUS_STYLES = {
  Present: "bg-status-success-bg text-status-success border-status-success/20",
  Absent: "bg-status-danger-bg text-status-danger border-status-danger/20",
  Late: "bg-status-warning-bg text-status-warning border-status-warning/20",
  Excused: "bg-status-info-bg text-status-info border-status-info/20",
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
    <div
      dir="rtl"
      data-testid="student-card-page"
      className="min-h-dvh w-full bg-surface-bg font-sans text-text-main"
    >
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-4 pb-24 sm:px-5 md:py-6 lg:max-w-5xl">
        <header className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary via-primary to-primary-hover p-5 text-primary-contrast shadow-card dark:from-primary-subtle dark:via-primary-subtle dark:to-surface-card dark:text-text-main sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-primary-contrast/10 dark:bg-primary/10"
          />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <CenterBadge
                name={card?.centerName}
                logoUrl={card?.centerLogoUrl}
              />
              <div className="min-w-0">
                <h1 className="break-words text-xl font-extrabold sm:text-2xl">
                  {card?.centerName || "كارت الطالب"}
                </h1>
                <p className="mt-0.5 break-words text-sm opacity-95">
                  {card
                    ? "كارت الطالب · متابعة الحضور والدرجات"
                    : "متابعة الحضور والدرجات"}
                </p>
              </div>
            </div>

            <QrCode
              className="h-9 w-9 shrink-0 opacity-90"
              aria-hidden="true"
            />
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          data-testid="student-card-search"
          className="flex flex-col gap-3 rounded-card border border-surface-border bg-surface-card p-4 shadow-soft sm:flex-row sm:items-center"
        >
          <div className="relative min-w-0 flex-1">
            <label htmlFor="student-card-code" className="sr-only">
              كود الطالب
            </label>
            <Search
              className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              id="student-card-code"
              type="text"
              value={inputCode}
              onChange={(event) => setInputCode(event.target.value)}
              placeholder="STU00000001"
              dir="ltr"
              autoComplete="off"
              className="min-h-12 w-full rounded-control border border-surface-border bg-surface-card py-3 pl-4 pr-11 text-center font-mono text-base tracking-widest text-text-main outline-none transition-colors placeholder:tracking-widest focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="min-h-12 shrink-0 rounded-action bg-primary px-6 text-base font-bold text-primary-contrast transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "جاري التحميل..." : "عرض الكارت"}
          </button>
        </form>

        {loading && (
          <div
            role="status"
            className="flex flex-col items-center justify-center gap-3 rounded-card border border-surface-border bg-surface-card px-6 py-16 text-center shadow-soft"
          >
            <Loader2
              className="h-8 w-8 animate-spin text-primary"
              aria-hidden="true"
            />
            <p className="text-sm font-semibold text-text-muted">
              جاري تحميل كارت الطالب...
            </p>
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            data-testid="student-card-error"
            className="flex flex-col items-center gap-3 rounded-card border border-dashed border-status-warning/40 bg-surface-card px-6 py-14 text-center shadow-soft"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-control bg-status-warning-bg text-status-warning">
              <TriangleAlert className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="break-words text-sm font-semibold text-text-main">
              {error}
            </p>
          </div>
        )}

        {!loading && card && (
          <>
            <section
              data-testid="student-card-result"
              className="flex flex-col gap-5 rounded-card border border-surface-border bg-surface-card p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words text-xl font-extrabold text-text-main sm:text-2xl">
                  {card.fullName}
                </p>
                <p className="mt-1 break-words text-sm text-text-muted">
                  {card.groupName || "بدون مجموعة"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {card.school && (
                    <span className="inline-flex min-h-9 items-center gap-1.5 rounded-pill bg-surface-muted px-3 py-1 font-semibold text-text-muted">
                      <School className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="break-words">{card.school}</span>
                    </span>
                  )}
                  <span className="inline-flex min-h-9 items-center gap-1.5 rounded-pill bg-surface-muted px-3 py-1 font-semibold text-text-muted">
                    <UserRound
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="break-words">{card.subscriptionType}</span>
                  </span>
                  {card.parentPhone && (
                    <span className="inline-flex min-h-9 items-center gap-1.5 rounded-pill bg-surface-muted px-3 py-1 font-semibold text-text-muted">
                      ولي الأمر
                      <span className="num break-all">{card.parentPhone}</span>
                    </span>
                  )}
                  <span className="num inline-flex min-h-9 items-center rounded-pill bg-primary-subtle px-3 py-1 font-bold text-primary">
                    {card.qrCode}
                  </span>
                </div>
              </div>

              {qrImage && (
                <img
                  src={qrImage}
                  alt={card.qrCode}
                  width="128"
                  height="128"
                  className="h-32 w-32 shrink-0 self-center rounded-card border border-surface-border bg-white p-1.5 shadow-soft"
                />
              )}
            </section>

            {summary && (
              <div
                data-testid="student-card-stats"
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
              >
                <StatTile
                  icon={CalendarCheck}
                  label="حصص مسجلة"
                  value={summary.totalSessions ?? 0}
                  tone="neutral"
                />
                <StatTile
                  icon={CalendarCheck}
                  label="حضور"
                  value={summary.presentSessions ?? 0}
                  tone="success"
                />
                <StatTile
                  icon={CalendarX}
                  label="غياب"
                  value={summary.absentSessions ?? 0}
                  tone="danger"
                />
                <StatTile
                  icon={Clock}
                  label="تأخر"
                  value={summary.lateSessions ?? 0}
                  tone="warning"
                />
                <StatTile
                  icon={ShieldCheck}
                  label="بعذر"
                  value={summary.excusedSessions ?? 0}
                  tone="info"
                />
                <StatTile
                  icon={Percent}
                  label="نسبة الحضور"
                  value={formatAttendanceRate(summary.attendanceRate)}
                  tone="primary"
                />
              </div>
            )}

            <section
              data-testid="student-card-attendance"
              className="space-y-3 rounded-card border border-surface-border bg-surface-card p-4 shadow-soft sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-control bg-primary-subtle text-primary">
                  <CalendarCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="text-base font-extrabold text-text-main">
                  سجل الحضور والغياب
                </h2>
                <span className="num rounded-pill bg-surface-muted px-2.5 py-0.5 text-sm font-bold text-text-muted">
                  {attendances.length}
                </span>
              </div>

              {attendances.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-muted">
                  مفيش حصص متسجلة لسه.
                </p>
              ) : (
                <ul className="space-y-2">
                  {attendances.map((item, index) => (
                    <li
                      key={`${item.sessionId}-${item.attendanceDate}-${index}`}
                      className="flex flex-col gap-2 rounded-control border border-surface-border bg-surface-bg px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold text-text-main">
                          {item.groupName || "حصة"}
                        </p>
                        <p className="mt-1 break-words text-sm text-text-muted">
                          {item.dayName} • {item.startTime} - {item.endTime} •{" "}
                          {formatDate(item.attendanceDate)}
                        </p>
                      </div>

                      <span
                        className={`inline-flex min-h-9 items-center self-start rounded-pill border px-3 py-1 text-sm font-bold sm:self-auto ${
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

            <section
              data-testid="student-card-exams"
              className="space-y-3 rounded-card border border-surface-border bg-surface-card p-4 shadow-soft sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-control bg-primary-subtle text-primary">
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="text-base font-extrabold text-text-main">
                  درجات الامتحانات
                </h2>
                <span className="num rounded-pill bg-surface-muted px-2.5 py-0.5 text-sm font-bold text-text-muted">
                  {exams.length}
                </span>
              </div>

              {exams.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-muted">
                  مفيش درجات متسجلة لسه.
                </p>
              ) : (
                <ul className="space-y-3">
                  {exams.map((exam) => (
                    <li
                      key={exam.examId}
                      className="rounded-control border border-surface-border bg-surface-bg p-3.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold text-text-main">
                            {exam.examName}
                          </p>
                          <p className="mt-1 break-words text-sm text-text-muted">
                            {formatDate(exam.examDate)}
                            {exam.groupName ? ` • ${exam.groupName}` : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {exam.isAbsent && (
                            <span className="rounded-pill border border-status-danger/20 bg-status-danger-bg px-2.5 py-1 text-sm font-bold text-status-danger">
                              غائب
                            </span>
                          )}
                          {exam.isLowGrade && (
                            <span className="inline-flex items-center gap-1 rounded-pill border border-status-warning/20 bg-status-warning-bg px-2.5 py-1 text-sm font-bold text-status-warning">
                              <TriangleAlert
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              درجة منخفضة
                            </span>
                          )}
                          <span className="num rounded-pill bg-primary-subtle px-2.5 py-1 text-sm font-bold text-primary">
                            {exam.percentage}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {exam.components.map((component, index) => (
                          <div
                            key={`${exam.examId}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-card px-3 py-2"
                          >
                            <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-text-muted">
                              <BookOpen
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                              />
                              <span className="break-words">
                                {component.typeLabel}
                              </span>
                            </span>
                            <span className="num text-sm font-bold text-text-main">
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
          <div
            data-testid="student-card-empty"
            className="flex flex-col items-center gap-3 rounded-card border border-dashed border-surface-border bg-surface-card px-6 py-16 text-center shadow-soft"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-control bg-surface-muted text-text-muted">
              <Award className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="break-words text-sm text-text-muted">
              امسح كارت الطالب أو اكتب الكود اللي تحت الكارت.
            </p>
          </div>
        )}

        <p className="pt-1 text-center text-sm text-text-muted">
          كارت الطالب · نظام إدارة السنتر
        </p>
      </div>
    </div>
  );
}

function CenterBadge({ name, logoUrl }) {
  const [failed, setFailed] = useState(false);
  const src = resolveImageUrl(logoUrl);

  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-card bg-primary-contrast/20 p-1.5 dark:bg-primary/20">
      {src && !failed ? (
        <img
          src={src}
          alt={name ? `شعار ${name}` : ""}
          width="40"
          height="40"
          className="h-9 w-9 rounded-control object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Building2 className="h-6 w-6" aria-hidden="true" />
      )}
    </span>
  );
}

function StatTile({ icon: Icon, label, value, tone }) {
  const tones = {
    neutral: "bg-surface-muted text-text-muted",
    success: "bg-status-success-bg text-status-success",
    danger: "bg-status-danger-bg text-status-danger",
    warning: "bg-status-warning-bg text-status-warning",
    info: "bg-status-info-bg text-status-info",
    primary: "bg-primary-subtle text-primary",
  };

  return (
    <div className="min-w-0 rounded-card border border-surface-border bg-surface-card p-3 text-center shadow-soft sm:p-4">
      <span
        className={`mx-auto flex h-10 w-10 items-center justify-center rounded-control ${tones[tone]}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="num mt-2 break-words text-xl font-extrabold leading-tight text-text-main">
        {value}
      </p>
      <p className="mt-0.5 break-words text-sm font-semibold text-text-muted">
        {label}
      </p>
    </div>
  );
}
