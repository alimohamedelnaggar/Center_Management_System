import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Maximize,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  X,
} from "@/components/icons";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/common/ConfirmModal";
import AppModal from "../../components/ui/AppModal";
import Button from "../../components/ui/Button";
import { questionImageUrl } from "../../services/questionBankService";
import { studentPortalService } from "../../services/studentPortalService";

const TYPE = { ESSAY: 3 };

const OFFLINE_SUBMIT_MESSAGE =
  "لا يوجد اتصال. لم يُسلَّم الامتحان بعد، وإجاباتك محفوظة على هذا الجهاز — أعد المحاولة بعد عودة الاتصال.";

const VIOLATION_LABELS = {
  "tab-switch": "مغادرة نافذة الامتحان",
  "window-blur": "فقدان التركيز على الامتحان",
  "fullscreen-exit": "الخروج من ملء الشاشة",
  copy: "محاولة نسخ",
  cut: "محاولة قص",
  paste: "محاولة لصق",
  "right-click": "النقر بزر الفأرة الأيمن",
  screenshot: "محاولة التقاط صورة للشاشة",
  print: "محاولة طباعة",
  devtools: "محاولة فتح أدوات المطور",
};

const EXAM_RULES = [
  "الامتحان في وضع ملء الشاشة، والخروج منه يُسجَّل كمخالفة.",
  "ممنوع مغادرة الصفحة أو فتح تاب آخر أو أي نافذة أخرى.",
  "ممنوع نسخ أو لصق أو قص أي من محتوى الأسئلة.",
  "ممنوع التقاط صورة للشاشة أو الطباعة.",
  "ممنوع فتح أدوات المطور (DevTools).",
  "كل مخالفة تُسجَّل وتظهر للمدرس مع نتيجتك.",
];

function formatClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatViolationTime(value) {
  try {
    return new Date(value).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function StudentExamAttemptPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Anti-cheat state
  const [started, setStarted] = useState(false);
  const [focused, setFocused] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState(0);
  const [violationLog, setViolationLog] = useState([]);
  const [showViolations, setShowViolations] = useState(false);

  // Local answer draft: answers survive a dropped connection or a reload.
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [draftState, setDraftState] = useState("idle");

  // Short viewport = phone landscape, or a portrait phone with the keyboard
  // open. The sticky chrome has to stay under 20% of the visible height there,
  // so it collapses to one row.
  const [compactHeader, setCompactHeader] = useState(false);
  const [fsWarningCollapsed, setFsWarningCollapsed] = useState(false);

  const draftKey = useMemo(() => `exam-draft:${attemptId}`, [attemptId]);

  const deadlineRef = useRef(null);
  const autoSubmittedRef = useRef(false);
  const activeRef = useRef(false);
  const lastViolationRef = useRef({});

  const questions = useMemo(() => attempt?.questions ?? [], [attempt]);
  const fsSupported =
    typeof document !== "undefined" && document.fullscreenEnabled;

  const requestFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenEnabled && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // ignore — some browsers reject without a fresh user gesture
    }
  }, []);

  const registerViolation = useCallback(
    (type, group) => {
      if (!activeRef.current) return;

      const key = group ?? type;
      const now = Date.now();
      if (
        lastViolationRef.current[key] &&
        now - lastViolationRef.current[key] < 1200
      )
        return;
      lastViolationRef.current[key] = now;

      const label = VIOLATION_LABELS[type] ?? "مخالفة";
      toast.error(`تم تسجيل مخالفة: ${label}`, { id: `viol-${key}` });
      setViolations((v) => v + 1);
      setViolationLog((log) => [
        { type, label, at: new Date().toISOString() },
        ...log,
      ].slice(0, 50));

      studentPortalService.reportViolation(attemptId, type).catch(() => {});
    },
    [attemptId],
  );

  useEffect(() => {
    activeRef.current = !!attempt && started && !submitting;
  }, [attempt, started, submitting]);

  const submitExam = useCallback(
    async (auto = false) => {
      if (submitting || autoSubmittedRef.current) return;
      autoSubmittedRef.current = true;

      setSubmitting(true);
      try {
        const payload = questions.map((q) => ({
          questionId: q.id,
          selectedOptionId: answers[q.id]?.selectedOptionId ?? null,
          essayAnswer: answers[q.id]?.essayAnswer ?? null,
        }));

        const res = await studentPortalService.submitAttempt(attemptId, payload);

        if (res?.succeeded) {
          try {
            localStorage.removeItem(draftKey);
          } catch {
            /* private mode — nothing else to clear */
          }
          if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
          }
          toast.success(res.message ?? "تم تسليم الامتحان بنجاح");
          navigate("/student/results", { replace: true });
        } else {
          autoSubmittedRef.current = false;
          toast.error(
            navigator.onLine === false
              ? OFFLINE_SUBMIT_MESSAGE
              : res?.message ?? "تعذّر تسليم الامتحان",
          );
        }
      } catch {
        autoSubmittedRef.current = false;
        toast.error(
          navigator.onLine === false
            ? OFFLINE_SUBMIT_MESSAGE
            : "تعذّر تسليم الامتحان",
        );
      } finally {
        setSubmitting(false);
        if (auto) setShowConfirm(false);
      }
    },
    [answers, attemptId, draftKey, navigate, questions, submitting],
  );

  const loadAttempt = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentPortalService.getAttempt(attemptId);

      if (res?.succeeded) {
        setAttempt(res.data);
        setRemaining(res.data.remainingSeconds ?? 0);
        setViolations(res.data.violationCount ?? 0);
        deadlineRef.current =
          Date.now() + (res.data.remainingSeconds ?? 0) * 1000;

        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.answers && typeof parsed.answers === "object") {
              setAnswers(parsed.answers);
              setDraftState("saved");
            }
          }
        } catch {
          /* a corrupt draft must never block the exam */
        }
      } else {
        toast.error(res?.message ?? "فشل في تحميل الامتحان");
      }
    } catch {
      toast.error("فشل في تحميل الامتحان");
    } finally {
      setLoading(false);
    }
  }, [attemptId, draftKey]);

  useEffect(() => {
    loadAttempt();
  }, [loadAttempt]);

  // Keep the local draft in step with the answers. The draft is UI-only: the
  // authoritative grade still comes from the submit payload.
  useEffect(() => {
    if (!attempt) return undefined;
    if (Object.keys(answers).length === 0) return undefined;

    const handle = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ answers, savedAt: Date.now() }),
        );
        setDraftState(online ? "saved" : "offline");
      } catch {
        setDraftState("offline");
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [answers, attempt, draftKey, online]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const vv = window.visualViewport;

    const measure = () => {
      const height = vv?.height || window.innerHeight || 0;
      setCompactHeader(height > 0 && height < 520);
    };

    measure();
    vv?.addEventListener("resize", measure);
    window.addEventListener("resize", measure);

    return () => {
      vv?.removeEventListener("resize", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Countdown + auto submit
  useEffect(() => {
    if (!attempt) return undefined;

    const timer = setInterval(() => {
      const deadline = deadlineRef.current;
      if (!deadline) return;
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(timer);
        submitExam(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, submitExam]);

  // ---------- Anti-cheat listeners ----------
  useEffect(() => {
    if (!attempt) return undefined;

    const onCopy = (e) => {
      e.preventDefault();
      registerViolation("copy");
    };
    const onCut = (e) => {
      e.preventDefault();
      registerViolation("cut");
    };
    const onPaste = (e) => {
      e.preventDefault();
      registerViolation("paste");
    };
    const onContextMenu = (e) => {
      e.preventDefault();
      registerViolation("right-click");
    };
    const onDragStart = (e) => e.preventDefault();
    const onSelectStart = (e) => {
      const tag = (e.target?.tagName ?? "").toLowerCase();
      if (tag !== "textarea" && tag !== "input") e.preventDefault();
    };

    const onKeyDown = (e) => {
      const key = (e.key ?? "").toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === "PrintScreen") {
        e.preventDefault();
        registerViolation("screenshot");
        return;
      }
      if (e.key === "F12") {
        e.preventDefault();
        registerViolation("devtools");
        return;
      }
      if (ctrl && e.shiftKey && ["i", "j", "c"].includes(key)) {
        e.preventDefault();
        registerViolation("devtools");
        return;
      }
      if (ctrl && ["c", "x", "v", "a", "u", "s", "p"].includes(key)) {
        e.preventDefault();
        if (key === "p") registerViolation("print");
        else if (key === "v") registerViolation("paste");
        else if (key === "x") registerViolation("cut");
        else registerViolation("copy");
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        setFocused(false);
        registerViolation("tab-switch", "focus");
      }
    };
    const onBlur = () => {
      setFocused(false);
      registerViolation("window-blur", "focus");
    };
    const onFocus = () => setFocused(true);
    const onBeforePrint = () => registerViolation("print");
    const onFullscreenChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs && activeRef.current) registerViolation("fullscreen-exit", "fs");
    };

    document.addEventListener("copy", onCopy, true);
    document.addEventListener("cut", onCut, true);
    document.addEventListener("paste", onPaste, true);
    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("dragstart", onDragStart, true);
    document.addEventListener("selectstart", onSelectStart, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("beforeprint", onBeforePrint);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("cut", onCut, true);
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("dragstart", onDragStart, true);
      document.removeEventListener("selectstart", onSelectStart, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("beforeprint", onBeforePrint);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [attempt, registerViolation]);

  const handleStart = useCallback(async () => {
    await requestFullscreen();
    setIsFullscreen(!!document.fullscreenElement);
    setFocused(true);
    setStarted(true);
  }, [requestFullscreen]);

  const handleRefocus = useCallback(async () => {
    await requestFullscreen();
    window.focus?.();
    setFocused(true);
    setIsFullscreen(!!document.fullscreenElement);
  }, [requestFullscreen]);

  const setAnswer = (id, patch) => {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const answeredCount = questions.filter((q) => {
    const entry = answers[q.id];
    if (!entry) return false;
    if (q.type === TYPE.ESSAY)
      return !!(entry.essayAnswer && entry.essayAnswer.trim());
    return !!entry.selectedOptionId;
  }).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-surface-bg text-sm text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        جاري تحميل الامتحان...
      </div>
    );
  }

  if (!attempt) return null;

  const lowTime = remaining <= 60;

  // ---------- Start screen (also the user gesture that enables fullscreen) ----------
  if (!started) {
    return (
      <div
        data-testid="student-exam-start"
        className="flex min-h-screen items-center justify-center bg-surface-bg p-4 font-sans"
      >
        <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface-card p-6 shadow-md">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-subtle text-primary">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-text-main">
                {attempt.examName}
              </h1>
              <p className="text-xs text-text-muted">
                اقرأ قواعد الامتحان قبل البدء
              </p>
            </div>
          </div>

          <ul className="mb-5 space-y-2">
            {EXAM_RULES.map((rule, index) => {
              const text =
                !fsSupported && index === 0
                  ? "متصفح هذا الجهاز لا يدعم ملء الشاشة؛ التزم بالبقاء داخل صفحة الامتحان وعدم مغادرتها."
                  : rule;
              return (
                <li
                  key={rule}
                  className="flex items-start gap-2 text-sm text-text-main"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={handleStart}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-text-inverse transition hover:bg-primary-hover"
          >
            <Maximize className="h-4 w-4" />
            بدء الامتحان
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="student-exam-attempt"
      className="exam-lock min-h-screen bg-surface-bg font-sans"
    >
      <style>{`
        .exam-lock { user-select: none; -webkit-user-select: none; }
        .exam-lock textarea, .exam-lock input { user-select: text; -webkit-user-select: text; }
        @media print { body { display: none !important; } }
      `}</style>

      {!focused && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-3 bg-surface-bg/95 px-6 text-center backdrop-blur-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-status-danger-bg text-status-danger">
            <ShieldAlert className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-bold text-text-main">
            غادرت صفحة الامتحان
          </h2>
          <p className="max-w-sm text-sm text-text-muted">
            لا يمكنك مشاهدة الأسئلة خارج نافذة الامتحان. تم تسجيل المخالفة، عد
            الآن للمتابعة.
          </p>
          <button
            type="button"
            onClick={handleRefocus}
            className="mt-1 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-text-inverse transition hover:bg-primary-hover"
          >
            <Maximize className="h-4 w-4" />
            العودة للامتحان
          </button>
        </div>
      )}

      <div
        data-testid="exam-sticky-header"
        className="sticky top-0 z-40 border-b border-surface-border bg-surface-card shadow-sm"
      >
        {fsSupported && !isFullscreen && !fsWarningCollapsed && !compactHeader && (
          <div
            data-testid="exam-fullscreen-warning"
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-status-warning-bg px-3 py-1.5 text-xs font-medium text-status-warning"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>أنت خارج وضع ملء الشاشة.</span>
            <button
              type="button"
              onClick={requestFullscreen}
              className="min-h-11 rounded-lg px-2 text-sm font-bold underline"
            >
              ملء الشاشة
            </button>
            <button
              type="button"
              onClick={() => setFsWarningCollapsed(true)}
              aria-label="إخفاء تحذير ملء الشاشة"
              data-testid="exam-fullscreen-dismiss"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-status-warning transition hover:bg-status-warning/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <header data-testid="exam-header">
          <div
            className={`mx-auto max-w-4xl px-3 sm:px-4 md:px-6 ${
              compactHeader ? "py-1" : "py-2"
            }`}
          >
            <div
              className={
                compactHeader
                  ? "flex items-center justify-between gap-2"
                  : "flex flex-wrap items-center justify-between gap-2"
              }
            >
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-sm font-bold text-text-main sm:text-base">
                  {attempt.examName}
                </h1>
                <p
                  className={`truncate text-[11px] text-text-muted ${
                    compactHeader ? "hidden" : ""
                  }`}
                >
                  أجب عن جميع الأسئلة • الدرجة الكلية {attempt.totalMark}
                </p>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                {fsSupported && !isFullscreen && (compactHeader || fsWarningCollapsed) && (
                  <button
                    type="button"
                    onClick={requestFullscreen}
                    aria-label="العودة لملء الشاشة"
                    data-testid="exam-fullscreen-inline"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-status-warning-bg text-status-warning transition hover:bg-status-warning/20"
                  >
                    <Maximize className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowViolations(true)}
                  aria-label={`سجل المخالفات (${violations})`}
                  data-testid="exam-violation-count"
                  className={`inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2 text-sm font-bold transition-colors ${
                    violations > 0
                      ? "bg-status-danger-bg text-status-danger hover:bg-status-danger hover:text-text-inverse"
                      : "bg-surface-muted text-text-muted hover:bg-surface-border"
                  }`}
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span className="num">{violations}</span>
                </button>

                <div
                  role="timer"
                  aria-label="الوقت المتبقي"
                  data-testid="exam-timer"
                  className={`inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2 text-sm font-bold ${
                    lowTime
                      ? "bg-status-danger-bg text-status-danger"
                      : "bg-primary-subtle text-primary"
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  <span className="num">{formatClock(remaining)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  disabled={submitting}
                  data-testid="exam-submit"
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-bold text-text-inverse transition hover:bg-primary-hover disabled:opacity-70 sm:px-4"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  تسليم
                </button>
              </div>
            </div>

            <div
              className={
                compactHeader ? "hidden" : "mt-2 flex items-center gap-2"
              }
            >
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-status-success transition-all"
                  style={{
                    width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <span
                data-testid="exam-draft-state"
                className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-medium ${
                  draftState === "offline"
                    ? "text-status-warning"
                    : "text-text-muted"
                }`}
              >
                {draftState === "offline" ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {draftState === "offline"
                  ? "غير متصل — حفظ محلي"
                  : draftState === "saved"
                    ? "حفظ تلقائي"
                    : "لم تُحفظ إجابة بعد"}
              </span>
            </div>
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-5 md:px-6">
        {!online && (
          <div
            data-testid="exam-offline-note"
            role="status"
            className="flex items-start gap-2 rounded-xl border border-status-warning/40 bg-status-warning-bg px-3 py-2.5 text-xs font-medium leading-relaxed text-status-warning"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              لا يوجد اتصال بالإنترنت. إجاباتك تُحفظ على هذا الجهاز، وتُرسل عند
              التسليم بعد عودة الاتصال.
            </span>
          </div>
        )}

        {questions.map((q, index) => {
          const entry = answers[q.id] ?? {};
          return (
            <div
              key={q.id}
              data-testid="exam-question"
              data-question-type={q.type}
              className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm md:p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <span className="mb-1 inline-flex rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-muted">
                      {q.typeName}
                    </span>
                    {q.text && (
                      <p className="text-sm leading-relaxed text-text-main">
                        {q.text}
                      </p>
                    )}
                    {q.imageName && (
                      <img
                        src={questionImageUrl(q.imageName)}
                        alt=""
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        className="mt-2 max-h-60 rounded-lg border border-surface-border object-contain"
                      />
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent-hover">
                  {q.mark} درجة
                </span>
              </div>

              {q.type === TYPE.ESSAY ? (
                <textarea
                  rows={4}
                  value={entry.essayAnswer ?? ""}
                  onChange={(e) =>
                    setAnswer(q.id, { essayAnswer: e.target.value })
                  }
                  placeholder="اكتب إجابتك هنا..."
                  className="w-full rounded-lg border border-surface-border bg-surface-bg px-3 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
                />
              ) : (
                <div className="space-y-2">
                  {q.options?.map((opt) => {
                    const selected = entry.selectedOptionId === opt.id;
                    return (
                      <label
                        key={opt.id}
                        className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                          selected
                            ? "border-primary bg-primary-subtle text-text-main"
                            : "border-surface-border bg-surface-bg text-text-main hover:bg-surface-muted"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${q.id}`}
                          checked={selected}
                          onChange={() =>
                            setAnswer(q.id, { selectedOptionId: opt.id })
                          }
                          className="h-4 w-4 accent-primary"
                        />
                        <span>{opt.text}</span>
                      </label>
                    );
                  })}

                  {(!q.options || q.options.length === 0) && (
                    <p className="flex items-center gap-2 rounded-lg bg-status-warning-bg px-3 py-2 text-xs text-status-warning">
                      <AlertTriangle className="h-4 w-4" />
                      لا توجد خيارات لهذا السؤال.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="pb-6">
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-text-inverse transition hover:bg-primary-hover disabled:opacity-70"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            تسليم الامتحان
          </button>
        </div>
      </main>

      <AppModal
        open={showViolations}
        onClose={() => setShowViolations(false)}
        title="سجل المخالفات"
        icon={ShieldAlert}
        testId="violation-log"
        size="max-w-md"
        footer={
          <Button
            variant="secondary"
            block
            onClick={() => setShowViolations(false)}
          >
            إغلاق
          </Button>
        }
      >
        <p className="mb-3 text-sm text-text-muted">
          كل مخالفة تُسجَّل وتظهر للمدرس مع نتيجتك. إجمالي المخالفات:{" "}
          <span className="num font-bold text-text-main">{violations}</span>
        </p>

        {violationLog.length === 0 ? (
          <p className="rounded-control border border-dashed border-surface-border bg-surface-bg/60 px-3 py-4 text-center text-sm text-text-muted">
            لا توجد مخالفات مسجلة خلال هذه الجلسة.
          </p>
        ) : (
          <ul data-testid="violation-log-list" className="space-y-2">
            {violationLog.map((entry, index) => (
              <li
                key={`${entry.type}-${entry.at}-${index}`}
                className="flex items-start justify-between gap-3 rounded-control border border-surface-border bg-surface-bg/60 px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-text-main">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-status-danger" />
                  <span className="break-words">{entry.label}</span>
                </span>
                <span className="num shrink-0 text-xs text-text-muted">
                  {formatViolationTime(entry.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AppModal>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => submitExam(false)}
        loading={submitting}
        title="تسليم الامتحان"
        message={`هل أنت متأكد من تسليم الامتحان؟ تمت الإجابة عن ${answeredCount} من ${questions.length} سؤال.${
          online
            ? ""
            : " تنبيه: لا يوجد اتصال حاليًا؛ إجاباتك محفوظة على هذا الجهاز، وسيتاح التسليم بعد عودة الاتصال."
        }`}
        confirmText="تسليم"
        cancelText="إلغاء"
      />
    </div>
  );
}
