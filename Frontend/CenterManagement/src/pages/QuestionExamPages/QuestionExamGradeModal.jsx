import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  X,
  XCircle,
} from "@/components/icons";
import toast from "react-hot-toast";
import { questionExamService } from "../../services/questionExamService";

const TYPE_ESSAY = 3;
const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

export default function QuestionExamGradeModal({
  open = false,
  attemptId = null,
  onClose,
  onGraded,
}) {
  const [detail, setDetail] = useState(null);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !attemptId) return;

    let active = true;
    setLoading(true);
    setDetail(null);

    const load = async () => {
      try {
        const response = await questionExamService.getAttemptDetail(attemptId);

        if (!active) return;

        if (response?.succeeded && response.data) {
          setDetail(response.data);

          const initial = {};
          (response.data.answers ?? [])
            .filter((a) => a.type === TYPE_ESSAY)
            .forEach((a) => {
              initial[a.answerId] = String(a.awardedMark ?? 0);
            });
          setMarks(initial);
        } else {
          toast.error(response?.message ?? "فشل في تحميل المحاولة");
        }
      } catch (error) {
        if (!active) return;
        console.error(error);
        toast.error("فشل في تحميل المحاولة");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [open, attemptId]);

  const essayQuestions = useMemo(
    () => (detail?.answers ?? []).filter((a) => a.type === TYPE_ESSAY),
    [detail],
  );

  if (!open) return null;

  const handleChange = (answerId, value) => {
    setMarks((prev) => ({ ...prev, [answerId]: value }));
  };

  const handleSave = async () => {
    if (!attemptId || !detail) return;

    const grades = [];
    for (const q of essayQuestions) {
      const raw = marks[q.answerId] ?? "";
      const value = Number(raw);

      if (raw === "" || Number.isNaN(value)) {
        toast.error("أدخل درجة صحيحة لكل سؤال مقالي");
        return;
      }
      if (value < 0 || value > q.mark) {
        toast.error(`الدرجة يجب أن تكون بين 0 و ${q.mark}`);
        return;
      }
      if (q.answerId && q.answerId !== EMPTY_GUID) {
        grades.push({ answerId: q.answerId, awardedMark: value });
      }
    }

    setSaving(true);
    try {
      const response = await questionExamService.gradeAttempt(attemptId, grades);

      if (response?.succeeded) {
        toast.success(response?.message ?? "تم حفظ التصحيح");
        onGraded?.();
        onClose?.();
      } else {
        toast.error(response?.message ?? "فشل في حفظ التصحيح");
      }
    } catch (error) {
      console.error(error);
      toast.error("فشل في حفظ التصحيح");
    } finally {
      setSaving(false);
    }
  };

  const renderAnswer = (q) => {
    if (q.type === TYPE_ESSAY) {
      return (
        <div className="rounded-lg border border-surface-border bg-surface-muted px-3 py-2 text-sm text-text-main">
          {q.essayAnswer ? (
            <span className="whitespace-pre-wrap">{q.essayAnswer}</span>
          ) : (
            <span className="text-text-muted">بدون إجابة</span>
          )}
        </div>
      );
    }

    const selected = q.options?.find((o) => o.id === q.selectedOptionId);
    const correct = q.options?.find((o) => o.id === q.correctOptionId);

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          إجابة الطالب:{" "}
          <span className="font-medium text-text-main">
            {selected?.text ?? "—"}
          </span>
          {q.isCorrect ? (
            <CheckCircle2 className="h-4 w-4 text-status-success" />
          ) : (
            <XCircle className="h-4 w-4 text-status-danger" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          الإجابة الصحيحة:{" "}
          <span className="font-medium text-status-success">
            {correct?.text ?? "—"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-text-main/40 px-4 font-sans"
      onClick={saving ? null : onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-text-main">
                تصحيح الإجابات المقالية
              </h2>
              {detail && (
                <p className="text-xs text-text-muted">
                  {detail.studentName} — {detail.score} / {detail.totalMark}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              جاري التحميل...
            </div>
          )}

          {!loading && detail && essayQuestions.length === 0 && (
            <p className="rounded-lg border border-dashed border-surface-border bg-surface-muted py-8 text-center text-sm text-text-muted">
              لا توجد أسئلة مقالية في هذا الامتحان.
            </p>
          )}

          {!loading &&
            essayQuestions.map((q) => (
              <div
                key={q.questionId}
                className="rounded-xl border border-surface-border bg-surface-card p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-text-main">
                    <span className="mr-1 text-text-muted">#{q.order}</span>
                    {q.text || "(سؤال بصورة)"}
                  </p>
                  <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-text-muted">
                    {q.mark} درجة
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-xs font-medium text-text-muted">
                      إجابة الطالب
                    </p>
                    {renderAnswer(q)}
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm text-text-main">الدرجة:</label>
                    <input
                      type="number"
                      min={0}
                      max={q.mark}
                      step="0.25"
                      value={marks[q.answerId] ?? ""}
                      onChange={(e) => handleChange(q.answerId, e.target.value)}
                      className="w-28 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
                    />
                    <span className="text-xs text-text-muted">
                      من {q.mark}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div className="flex items-center gap-3 border-t border-surface-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-surface-border bg-surface-card px-4 py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-surface-muted"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || !detail}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ التصحيح
          </button>
        </div>
      </div>
    </div>
  );
}
