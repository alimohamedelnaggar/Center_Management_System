import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, X } from "@/components/icons";
import toast from "react-hot-toast";
import { questionExamService } from "../../services/questionExamService";
import PickQuestionsModal from "./PickQuestionsModal";

const MODE = {
  PAPER: 1,
  ELECTRONIC: 2,
};

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const toTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const buildStartDate = (date, time) => {
  if (!date) return new Date();
  const safeTime = time && /^\d{1,2}:\d{2}$/.test(time) ? time : "00:00";
  const parsed = new Date(`${date}T${safeTime.padStart(5, "0")}:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export default function QuestionExamModal({
  open = false,
  exam = null,
  groups = [],
  academicYears = [],
  onClose,
  onSave,
}) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [mode, setMode] = useState(MODE.PAPER);
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("00:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [questions, setQuestions] = useState([]);

  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setName(exam?.name ?? "");
    setGroupId(exam?.groupId ?? "");
    setAcademicYearId(exam?.academicYearId ?? "");
    setMode(exam?.mode ?? MODE.PAPER);
    setExamDate(exam?.examDate ? toDateInput(exam.examDate) : toDateInput(new Date()));
    setExamTime(exam?.examDate ? toTimeInput(exam.examDate) : "00:00");
    setDurationMinutes(exam?.durationMinutes ? exam.durationMinutes : 60);
    setShuffleQuestions(exam?.shuffleQuestions ?? false);
    setShuffleOptions(exam?.shuffleOptions ?? false);
    setQuestions([]);

    if (exam?.id) {
      loadExamQuestions(exam.id);
    }
  }, [open, exam?.id]);

  const loadExamQuestions = async (id) => {
    try {
      setLoading(true);
      const response = await questionExamService.getById(id);

      if (response?.succeeded && response.data) {
        const detail = response.data;
        setQuestions(
          (detail.questions ?? []).map((q) => ({
            id: q.id,
            type: q.type,
            typeName: q.typeName,
            text: q.text,
            imageName: q.imageName,
            mark: q.mark,
            options: q.options ?? [],
          })),
        );
      } else {
        toast.error(response?.message ?? "فشل في تحميل أسئلة الامتحان");
      }
    } catch (error) {
      console.error(error);
      toast.error("فشل في تحميل أسئلة الامتحان");
    } finally {
      setLoading(false);
    }
  };

  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + Number(q.mark || 0), 0),
    [questions],
  );

  const endPreview = useMemo(() => {
    if (mode !== MODE.ELECTRONIC || !examDate || Number(durationMinutes) <= 0) {
      return "";
    }
    const start = buildStartDate(examDate, examTime);
    const end = new Date(start.getTime() + Number(durationMinutes) * 60000);
    return end.toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [mode, examDate, examTime, durationMinutes]);

  if (!open) return null;

  const handleAddQuestions = (picked) => {
    setQuestions((prev) => {
      const existingIds = new Set(prev.map((q) => q.id));
      const additions = picked.filter((q) => !existingIds.has(q.id));
      return [...prev, ...additions];
    });
    setShowPicker(false);
  };

  const removeQuestion = (id) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const moveQuestion = (index, direction) => {
    setQuestions((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("اكتب اسم الامتحان");
      return;
    }
    if (!groupId) {
      toast.error("اختر المجموعة");
      return;
    }
    if (!academicYearId) {
      toast.error("اختر السنة الدراسية");
      return;
    }
    if (questions.length === 0) {
      toast.error("أضف أسئلة الامتحان");
      return;
    }
    if (mode === MODE.ELECTRONIC && Number(durationMinutes) <= 0) {
      toast.error("حدد مدة الامتحان بالدقائق");
      return;
    }
    if (mode === MODE.ELECTRONIC && !examDate) {
      toast.error("حدد تاريخ وساعة بداية الامتحان");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: name.trim(),
        groupId,
        academicYearId,
        mode,
        examDate: buildStartDate(examDate, examTime).toISOString(),
        durationMinutes: mode === MODE.ELECTRONIC ? Number(durationMinutes) : 0,
        shuffleQuestions: mode === MODE.ELECTRONIC ? shuffleQuestions : false,
        shuffleOptions: mode === MODE.ELECTRONIC ? shuffleOptions : false,
        questionIds: questions.map((q) => q.id),
      };

      await onSave?.(exam ? { id: exam.id, ...payload } : payload);
    } catch (error) {
      console.error("فشل حفظ الامتحان", error);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle";

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/40 px-4 font-sans"
      onClick={saving ? null : onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="text-base font-bold text-text-main">
            {exam ? "تعديل الامتحان" : "إنشاء امتحان جديد"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {/* Shuffle (electronic only) */}
          {mode === MODE.ELECTRONIC && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-surface-border bg-surface-card px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-border text-primary focus:ring-primary-subtle"
                />
                <span className="text-sm text-text-main">
                  خلط ترتيب الأسئلة لكل طالب
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-surface-border bg-surface-card px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-border text-primary focus:ring-primary-subtle"
                />
                <span className="text-sm text-text-main">
                  خلط ترتيب الاختيارات لكل طالب
                </span>
              </label>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              اسم الامتحان
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: امتحان الوحدة الأولى"
              className={inputClass}
            />
          </div>

          {/* Group + Academic Year */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-main">
                المجموعة
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className={inputClass}
              >
                <option value="">اختر المجموعة</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-main">
                السنة الدراسية
              </label>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className={inputClass}
              >
                <option value="">اختر السنة الدراسية</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              نوع الامتحان
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode(MODE.PAPER)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  mode === MODE.PAPER
                    ? "border-primary bg-primary-subtle text-primary"
                    : "border-surface-border bg-surface-card text-text-muted hover:bg-surface-muted"
                }`}
              >
                ورقي
              </button>
              <button
                type="button"
                onClick={() => setMode(MODE.ELECTRONIC)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  mode === MODE.ELECTRONIC
                    ? "border-primary bg-primary-subtle text-primary"
                    : "border-surface-border bg-surface-card text-text-muted hover:bg-surface-muted"
                }`}
              >
                إلكتروني
              </button>
            </div>
          </div>

          {/* Schedule */}
          <div
            className={`grid grid-cols-1 gap-4 ${
              mode === MODE.ELECTRONIC ? "sm:grid-cols-3" : "sm:grid-cols-2"
            }`}
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-main">
                {mode === MODE.ELECTRONIC ? "تاريخ البداية" : "تاريخ الامتحان"}
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className={inputClass}
              />
            </div>
            {mode === MODE.ELECTRONIC && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-main">
                  ساعة البداية
                </label>
                <input
                  type="time"
                  value={examTime}
                  onChange={(e) => setExamTime(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            {mode === MODE.ELECTRONIC && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-main">
                  المدة (بالدقائق)
                </label>
                <input
                  type="number"
                  min="1"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </div>

          {mode === MODE.ELECTRONIC && endPreview && (
            <p className="rounded-lg border border-surface-border bg-surface-muted px-3 py-2.5 text-sm text-text-muted">
              يبدأ الامتحان في{" "}
              <span className="font-semibold text-text-main">
                {buildStartDate(examDate, examTime).toLocaleString("ar-EG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>{" "}
              — وينتهي في{" "}
              <span className="font-semibold text-text-main">{endPreview}</span>
            </p>
          )}

          {/* Questions */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-text-main">
                أسئلة الامتحان
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">
                  {questions.length} سؤال — {totalMarks} درجة
                </span>
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover"
                >
                  <Plus className="h-4 w-4" />
                  إضافة أسئلة
                </button>
              </div>
            </div>

            {loading && (
              <p className="py-6 text-center text-sm text-text-muted">جاري التحميل...</p>
            )}

            {!loading && questions.length === 0 && (
              <p className="rounded-lg border border-dashed border-surface-border bg-surface-muted py-6 text-center text-sm text-text-muted">
                لم تُضف أسئلة بعد، اضغط "إضافة أسئلة".
              </p>
            )}

            <div className="space-y-2">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-card p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-text-main">
                      {q.text || "(سؤال بصورة)"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-text-muted">
                        {q.typeName}
                      </span>
                      <span className="rounded-full bg-status-success-bg px-2 py-0.5 text-[11px] font-semibold text-status-success">
                        {q.mark} درجة
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, -1)}
                      disabled={index === 0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted disabled:opacity-40"
                      title="لأعلى"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, 1)}
                      disabled={index === questions.length - 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted disabled:opacity-40"
                      title="لأسفل"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      aria-label="حذف"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-status-danger-bg text-status-danger transition-colors hover:bg-status-danger hover:text-text-inverse"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
            onClick={handleSubmit}
            disabled={saving || loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {exam ? "حفظ التعديلات" : "إنشاء الامتحان"}
          </button>
        </div>

        <PickQuestionsModal
          open={showPicker}
          academicYearId={academicYearId}
          selectedIds={questions.map((q) => q.id)}
          onClose={() => setShowPicker(false)}
          onConfirm={handleAddQuestions}
        />
      </div>
    </div>
  );
}
