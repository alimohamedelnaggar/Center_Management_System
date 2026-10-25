import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileQuestion,
  Loader2,
  PlayCircle,
  RefreshCw,
} from "@/components/icons";
import toast from "react-hot-toast";
import { studentPortalService } from "../../services/studentPortalService";

const statusMeta = {
  upcoming: {
    label: "لم يبدأ بعد",
    className: "bg-surface-muted text-text-muted",
  },
  available: {
    label: "متاح الآن",
    className: "bg-status-success-bg text-status-success",
  },
  inprogress: {
    label: "قيد الحل",
    className: "bg-status-warning-bg text-status-warning",
  },
  finished: {
    label: "تم التسليم",
    className: "bg-status-info-bg text-status-info",
  },
  expired: {
    label: "انتهى",
    className: "bg-status-danger-bg text-status-danger",
  },
};

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "-";
  }
}

export default function StudentExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState(null);

  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentPortalService.getExams();
      if (res?.succeeded) {
        setExams(res.data ?? []);
      } else {
        toast.error(res?.message ?? "فشل في تحميل الامتحانات");
      }
    } catch {
      toast.error("فشل في تحميل الامتحانات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const handleAction = async (exam) => {
    if (exam.status === "inprogress" && exam.attemptId) {
      navigate(`/student/attempt/${exam.attemptId}`);
      return;
    }

    if (exam.status !== "available") return;

    setStartingId(exam.examId);
    try {
      const res = await studentPortalService.startExam(exam.examId);
      if (res?.succeeded) {
        navigate(`/student/attempt/${res.data.attemptId}`);
      } else {
        toast.error(res?.message ?? "تعذّر بدء الامتحان");
      }
    } catch {
      toast.error("تعذّر بدء الامتحان");
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 font-sans">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-main">امتحاناتي</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            الامتحانات الإلكترونية المتاحة لمجموعاتك
          </p>
        </div>
        <button
          type="button"
          onClick={loadExams}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-main transition hover:bg-surface-muted"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-card py-16 text-sm text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري التحميل...
        </div>
      )}

      {!loading && exams.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-surface-border bg-surface-card py-16 text-center">
          <ClipboardList className="h-10 w-10 text-text-muted" />
          <p className="text-sm text-text-muted">لا توجد امتحانات متاحة حالياً</p>
        </div>
      )}

      {!loading && exams.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => {
            const meta = statusMeta[exam.status] ?? statusMeta.upcoming;
            const canStart = exam.status === "available";
            const canResume = exam.status === "inprogress";

            return (
              <div
                key={exam.examId}
                className="flex flex-col rounded-xl border border-surface-border bg-surface-card p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-text-main">
                        {exam.name}
                      </h3>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {exam.groupName}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      statusMeta[exam.status]?.className ??
                      statusMeta.upcoming.className
                    }`}
                  >
                    {statusMeta[exam.status]?.label ?? "غير محدد"}
                  </span>
                </div>

                <div className="mb-4 space-y-2 text-sm text-text-muted">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    <span>{formatDateTime(exam.examDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>المدة {exam.durationMinutes} دقيقة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileQuestion className="h-4 w-4" />
                    <span>
                      {exam.questionsCount} سؤال • الدرجة {exam.totalMarks}
                    </span>
                  </div>
                </div>

                {exam.status === "finished" && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-status-info-bg px-3 py-2 text-sm font-medium text-status-info">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      الدرجة: {exam.score ?? 0} / {exam.scoredTotalMark ?? exam.totalMarks}
                      {exam.hasPendingManualGrading ? " (بانتظار تصحيح المقالي)" : ""}
                    </span>
                  </div>
                )}

                <div className="mt-auto">
                  {(exam.status === "available" ||
                    exam.status === "inprogress") && (
                    <button
                      type="button"
                      onClick={() => handleAction(exam)}
                      disabled={startingId === exam.examId}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-text-inverse transition hover:bg-primary-hover disabled:opacity-70"
                    >
                      {startingId === exam.examId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlayCircle className="h-4 w-4" />
                      )}
                      {exam.status === "inprogress"
                        ? "استكمال الامتحان"
                        : "ابدأ الامتحان"}
                    </button>
                  )}

                  {exam.status === "upcoming" && (
                    <p className="rounded-lg bg-surface-muted px-3 py-2 text-center text-xs font-medium text-text-muted">
                      يفتح الامتحان في الموعد المحدد
                    </p>
                  )}

                  {exam.status === "expired" && (
                    <p className="rounded-lg bg-surface-muted px-3 py-2 text-center text-xs font-medium text-text-muted">
                      انتهى وقت هذا الامتحان
                    </p>
                  )}

                  {exam.status === "finished" && (
                    <button
                      type="button"
                      onClick={() => navigate("/student/results")}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2.5 text-sm font-medium text-text-main transition hover:bg-surface-muted"
                    >
                      <ClipboardList className="h-4 w-4" />
                      عرض النتائج
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
