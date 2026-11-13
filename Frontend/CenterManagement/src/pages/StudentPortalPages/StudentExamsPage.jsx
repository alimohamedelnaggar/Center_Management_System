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
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import {
  PortalEmpty,
  PortalLoading,
  PortalStatus,
} from "../../components/portal/PortalUI";
import { studentPortalService } from "../../services/studentPortalService";

const statusMeta = {
  upcoming: {
    label: "لم يبدأ بعد",
    tone: "neutral",
  },
  available: {
    label: "متاح الآن",
    tone: "success",
  },
  inprogress: {
    label: "قيد الحل",
    tone: "warning",
  },
  finished: {
    label: "تم التسليم",
    tone: "info",
  },
  expired: {
    label: "انتهى",
    tone: "danger",
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
    <div data-testid="student-exams-page" className="p-4 font-sans md:p-6">
      <PageHeader
        className="mb-5"
        title="امتحاناتي"
        subtitle="الامتحانات الإلكترونية المتاحة لمجموعاتك"
        actions={
          <Button variant="secondary" onClick={loadExams} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        }
      />

      {loading && <PortalLoading icon={Loader2} />}

      {!loading && exams.length === 0 && (
        <PortalEmpty icon={ClipboardList} title="لا توجد امتحانات متاحة حالياً" />
      )}

      {!loading && exams.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => {
            const meta = statusMeta[exam.status] ?? {
              label: "غير محدد",
              tone: "neutral",
            };

            return (
              <article
                key={exam.examId}
                data-testid="student-exam-card"
                className="flex min-w-0 flex-col rounded-card border border-surface-border bg-surface-card p-5 shadow-soft transition hover:border-primary/60 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-lg font-extrabold leading-7 text-text-main">
                      {exam.name}
                    </h2>
                    <p className="mt-0.5 break-words text-sm text-text-muted">
                      {exam.groupName}
                    </p>
                  </div>
                  <PortalStatus tone={meta.tone}>{meta.label}</PortalStatus>
                </div>

                <div className="mb-4 space-y-2 text-sm text-text-muted">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      {formatDateTime(exam.examDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>المدة {exam.durationMinutes} دقيقة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileQuestion className="h-4 w-4 shrink-0" />
                    <span>
                      {exam.questionsCount} سؤال • الدرجة {exam.totalMarks}
                    </span>
                  </div>
                </div>

                {exam.status === "finished" && (
                  <div className="mb-3 flex items-center gap-2 rounded-control bg-status-info-bg px-3 py-2 text-sm font-bold text-status-info">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="tabular-nums">
                      الدرجة: {exam.score ?? 0} / {exam.scoredTotalMark ?? exam.totalMarks}
                      {exam.hasPendingManualGrading ? " (بانتظار تصحيح المقالي)" : ""}
                    </span>
                  </div>
                )}

                <div className="mt-auto">
                  {(exam.status === "available" ||
                    exam.status === "inprogress") && (
                    <Button
                      block
                      onClick={() => handleAction(exam)}
                      loading={startingId === exam.examId}
                      disabled={startingId === exam.examId}
                    >
                      {startingId !== exam.examId && (
                        <PlayCircle className="h-4 w-4" />
                      )}
                      {exam.status === "inprogress"
                        ? "استكمال الامتحان"
                        : "ابدأ الامتحان"}
                    </Button>
                  )}

                  {exam.status === "upcoming" && (
                    <p className="rounded-control bg-surface-muted px-3 py-2.5 text-center text-sm font-medium text-text-muted">
                      يفتح الامتحان في الموعد المحدد
                    </p>
                  )}

                  {exam.status === "expired" && (
                    <p className="rounded-control bg-surface-muted px-3 py-2.5 text-center text-sm font-medium text-text-muted">
                      انتهى وقت هذا الامتحان
                    </p>
                  )}

                  {exam.status === "finished" && (
                    <Button
                      variant="secondary"
                      block
                      onClick={() => navigate("/student/results")}
                    >
                      <ClipboardList className="h-4 w-4" />
                      عرض النتائج
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
