import { Fragment, useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardCheck,
  EyeOff,
  Loader2,
  Send,
  ShieldAlert,
  X,
} from "@/components/icons";
import toast from "react-hot-toast";
import { questionExamService } from "../../services/questionExamService";
import QuestionExamGradeModal from "./QuestionExamGradeModal";

const STATUS_META = {
  notstarted: {
    label: "لم يبدأ",
    className: "bg-surface-muted text-text-muted",
  },
  inprogress: {
    label: "قيد الحل",
    className: "bg-status-warning-bg text-status-warning",
  },
  finished: {
    label: "انتهى",
    className: "bg-status-success-bg text-status-success",
  },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    className: "bg-surface-muted text-text-muted",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export default function QuestionExamResultsModal({
  open = false,
  exam = null,
  onClose,
  onPublishedChange,
}) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [gradeAttemptId, setGradeAttemptId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open || !exam?.id) return;

    let active = true;
    setExpanded(null);
    setPublished(Boolean(exam?.isResultsPublished));

    const load = async () => {
      setLoading(true);
      try {
        const response = await questionExamService.getResults(exam.id);
        if (!active) return;
        if (response?.succeeded) {
          setResults(response.data ?? []);
        } else {
          setResults([]);
          toast.error(response?.message ?? "فشل في تحميل النتائج");
        }
      } catch (error) {
        if (!active) return;
        console.error(error);
        setResults([]);
        toast.error("فشل في تحميل النتائج");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [open, exam?.id, reloadKey]);

  if (!open) return null;

  const finished = results.filter((r) => r.status === "finished").length;
  const withViolations = results.filter((r) => (r.violationCount ?? 0) > 0).length;

  const handleTogglePublish = async () => {
    if (!exam?.id || publishing) return;

    setPublishing(true);
    try {
      const response = await questionExamService.publishResults(
        exam.id,
        !published,
      );

      if (response?.succeeded) {
        setPublished(!published);
        toast.success(response?.message ?? "تم تحديث حالة النشر");
        onPublishedChange?.(exam.id, !published);
      } else {
        toast.error(response?.message ?? "فشل في تحديث حالة النشر");
      }
    } catch {
      toast.error("فشل في تحديث حالة النشر");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-surface-border bg-surface-card shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-surface-border p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-subtle text-primary">
              <BarChart3 className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-base font-bold text-text-main">
                نتائج الامتحان
              </h3>
              <p className="text-xs text-text-muted">{exam?.name}</p>
              <div className="mt-1.5">
                {published ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-status-success-bg px-2.5 py-0.5 text-[11px] font-medium text-status-success">
                    النتائج منشورة للطلاب
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-status-warning-bg px-2.5 py-0.5 text-[11px] font-medium text-status-warning">
                    النتائج غير منشورة
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted transition-colors hover:text-text-main"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!loading && results.length > 0 && (
          <div className="flex flex-wrap gap-4 border-b border-surface-border px-5 py-3 text-xs">
            <span className="text-text-muted">
              إجمالي الطلاب:{" "}
              <span className="font-bold text-text-main">{results.length}</span>
            </span>
            <span className="text-text-muted">
              أنهوا الامتحان:{" "}
              <span className="font-bold text-status-success">{finished}</span>
            </span>
            <span className="text-text-muted">
              عليهم مخالفات:{" "}
              <span className="font-bold text-status-danger">
                {withViolations}
              </span>
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              جاري تحميل النتائج...
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <BarChart3 className="h-10 w-10 text-text-muted" />
              <p className="text-sm text-text-muted">
                لا توجد نتائج لهذا الامتحان بعد.
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <table className="w-full text-right">
              <thead className="sticky top-0 bg-surface-muted text-xs font-semibold text-text-muted">
                <tr className="border-b border-surface-border">
                  <th className="w-12 px-4 py-3">#</th>
                  <th className="px-4 py-3">الطالب</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">الدرجة</th>
                  <th className="px-4 py-3">المخالفات</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, idx) => {
                  const hasViolations = (r.violationCount ?? 0) > 0;
                  const isOpen = expanded === r.studentId;
                  return (
                    <Fragment key={r.studentId}>
                      <tr className="border-b border-surface-border last:border-0">
                        <td className="px-4 py-3 text-sm text-text-muted">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-text-main">
                          {r.studentName}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-text-main">
                          {r.status === "finished" ? (
                            <>
                              <span className="font-bold">
                                {r.score ?? 0}
                              </span>
                              <span className="text-text-muted">
                                {" "}
                                / {r.totalMark}
                              </span>
                              {r.hasPendingManualGrading && (
                                <span className="mr-2 text-[11px] text-status-warning">
                                  (بانتظار التصحيح)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                          {r.attemptId && (
                            <button
                              type="button"
                              onClick={() => setGradeAttemptId(r.attemptId)}
                              className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-primary-subtle px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary hover:text-text-inverse"
                            >
                              <ClipboardCheck className="h-3.5 w-3.5" />
                              تصحيح المقالي
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasViolations ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpanded(isOpen ? null : r.studentId)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-status-danger-bg px-2.5 py-1 text-xs font-bold text-status-danger transition-colors hover:bg-status-danger hover:text-text-inverse"
                            >
                              <ShieldAlert className="h-3.5 w-4" />
                              {r.violationCount}
                            </button>
                          ) : (
                            <span className="inline-flex rounded-full bg-status-success-bg px-2.5 py-1 text-xs font-medium text-status-success">
                              لا يوجد
                            </span>
                          )}
                        </td>
                      </tr>
                      {isOpen && hasViolations && (
                        <tr className="bg-surface-muted/60">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="rounded-xl border border-surface-border bg-surface-card p-3">
                              <p className="mb-2 text-xs font-bold text-text-main">
                                تفاصيل المخالفات
                              </p>
                              <div className="space-y-1.5">
                                {r.violations.map((v) => (
                                  <div
                                    key={v.type}
                                    className="flex items-center justify-between gap-2 text-xs"
                                  >
                                    <span className="text-text-muted">
                                      {v.label}
                                      {v.lastAt && (
                                        <span className="mr-1 text-[10px] text-text-muted/70">
                                          (آخر مرة:{" "}
                                          {new Date(v.lastAt).toLocaleTimeString(
                                            "ar-EG",
                                            {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            },
                                          )}
                                          )
                                        </span>
                                      )}
                                    </span>
                                    <span className="font-bold text-status-danger">
                                      {v.count}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-surface-border p-4">
          <button
            type="button"
            onClick={handleTogglePublish}
            disabled={publishing}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors disabled:opacity-60 ${
              published
                ? "bg-status-danger-bg text-status-danger hover:bg-status-danger hover:text-text-inverse"
                : "bg-primary text-text-inverse hover:bg-primary-hover"
            }`}
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : published ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {published ? "إلغاء نشر النتائج" : "نشر النتائج للطلاب"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-bold text-text-muted transition-colors hover:bg-surface-muted"
          >
            إغلاق
          </button>
        </div>
      </div>

      <QuestionExamGradeModal
        open={Boolean(gradeAttemptId)}
        attemptId={gradeAttemptId}
        onClose={() => setGradeAttemptId(null)}
        onGraded={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
