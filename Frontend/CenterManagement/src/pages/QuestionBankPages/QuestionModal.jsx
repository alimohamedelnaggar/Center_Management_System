import { useEffect, useMemo, useState } from "react";
import { Check, ImagePlus, Loader2, Trash2, X } from "@/components/icons";
import toast from "react-hot-toast";
import { questionBankService, questionImageUrl } from "../../services/questionBankService";

const Q_TYPE = {
  TRUE_FALSE: 1,
  MULTIPLE: 2,
  ESSAY: 3,
};

function buildInitialOptions() {
  return [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ];
}

export default function QuestionModal({
  open = true,
  question = null,
  onClose,
  onSave,
}) {
  const [type, setType] = useState(Q_TYPE.TRUE_FALSE);
  const [text, setText] = useState("");
  const [imageName, setImageName] = useState("");
  const [mark, setMark] = useState(1);
  const [uploadFile, setUploadFile] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [options, setOptions] = useState(buildInitialOptions());
  const [tfAnswer, setTfAnswer] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setType(question?.type ?? Q_TYPE.TRUE_FALSE);
    setText(question?.text ?? "");
    setImageName(question?.imageName ?? "");
    setMark(question?.mark ?? 1);
    setUploadFile(null);
    setImageRemoved(false);

    const existing = question?.options ?? [];

    const correct = existing.find((opt) => opt.isCorrect);
    setTfAnswer(correct ? correct.order !== 2 : true);

    const next = buildInitialOptions();
    existing.forEach((opt, idx) => {
      if (next[idx]) {
        next[idx].text = opt.text;
        next[idx].isCorrect = opt.isCorrect;
      }
    });
    setOptions(next);
  }, [question, open]);

  const previewUrl = useMemo(() => {
    if (uploadFile) return URL.createObjectURL(uploadFile);
    if (imageName && !imageRemoved) return questionImageUrl(imageName);
    return null;
  }, [uploadFile, imageName, imageRemoved]);

  if (!open) return null;

  const setOptionText = (idx, value) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === idx ? { ...opt, text: value } : opt)),
    );
  };

  const setOptionCorrect = (idx) => {
    setOptions((prev) =>
      prev.map((opt, i) => ({ ...opt, isCorrect: i === idx })),
    );
  };

  const handlePickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة كبير، الحد الأقصى 5 ميجابايت");
      e.target.value = "";
      return;
    }

    setUploadFile(file);
    setImageRemoved(false);
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    setUploadFile(null);
    if (imageName) setImageRemoved(true);
  };

  const handleSave = async () => {
    if (saving || uploading) return;

    if (!text.trim() && !uploadFile && !(imageName && !imageRemoved)) {
      toast.error("اكتب نص السؤال أو ارفع صورة للسؤال");
      return;
    }

    if (type === Q_TYPE.MULTIPLE) {
      const filled = options.filter((o) => o.text.trim());
      if (filled.length === 0) {
        toast.error("أدخل اختيارات السؤال");
        return;
      }
      if (filled.filter((o) => o.isCorrect).length !== 1) {
        toast.error("اختر إجابة صحيحة واحدة فقط");
        return;
      }
    }

    setSaving(true);

    try {
      let finalImageName = imageRemoved ? null : imageName || null;

      if (uploadFile) {
        setUploading(true);
        const res = await questionBankService.uploadQuestionImage(uploadFile);
        setUploading(false);

        if (res?.succeeded && res?.data) {
          finalImageName = res.data;
        } else {
          toast.error(res?.message ?? "فشل رفع الصورة");
          setSaving(false);
          return;
        }
      }

      await onSave?.({
        type,
        text: text.trim() || null,
        imageName: finalImageName,
        mark: Number(mark) > 0 ? Number(mark) : 1,
        options:
          type === Q_TYPE.MULTIPLE
            ? options
                .filter((o) => o.text.trim())
                .map((o) => ({
                  text: o.text.trim(),
                  isCorrect: o.isCorrect,
                }))
            : type === Q_TYPE.TRUE_FALSE
              ? [
                  { text: "صح", isCorrect: tfAnswer },
                  { text: "غلط", isCorrect: !tfAnswer },
                ]
              : [],
      });
    } catch (error) {
      console.error("فشل حفظ السؤال", error);
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/40 px-4 font-sans"
      onClick={saving ? null : onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-surface-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="text-base font-bold text-text-main">
            {question ? "تعديل السؤال" : "إضافة سؤال جديد"}
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

        <div className="space-y-4 px-5 py-5">
          {/* Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              نوع السؤال
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setType(Q_TYPE.TRUE_FALSE)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  type === Q_TYPE.TRUE_FALSE
                    ? "border-primary bg-primary-subtle text-primary"
                    : "border-surface-border bg-surface-card text-text-muted hover:bg-surface-muted"
                }`}
              >
                صح وغلط
              </button>
              <button
                type="button"
                onClick={() => setType(Q_TYPE.MULTIPLE)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  type === Q_TYPE.MULTIPLE
                    ? "border-primary bg-primary-subtle text-primary"
                    : "border-surface-border bg-surface-card text-text-muted hover:bg-surface-muted"
                }`}
              >
                اختر من متعدد
              </button>
              <button
                type="button"
                onClick={() => setType(Q_TYPE.ESSAY)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  type === Q_TYPE.ESSAY
                    ? "border-primary bg-primary-subtle text-primary"
                    : "border-surface-border bg-surface-card text-text-muted hover:bg-surface-muted"
                }`}
              >
                مقالي
              </button>
            </div>
          </div>

          {/* Mark */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              درجة السؤال
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={mark}
              onChange={(e) => setMark(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
            />
          </div>

          {/* Text */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              نص السؤال <span className="font-normal text-text-muted">(اختياري لو رفعت صورة)</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="اكتب نص السؤال هنا..."
              className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
            />
          </div>

          {/* Image */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              صورة السؤال <span className="font-normal text-text-muted">(اختياري)</span>
            </label>

            {previewUrl ? (
              <div className="relative overflow-hidden rounded-lg border border-surface-border">
                <img
                  src={previewUrl}
                  alt="السؤال"
                  className="max-h-64 w-full object-contain bg-surface-muted"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute left-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-status-danger text-white shadow-sm transition-opacity hover:opacity-90"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-surface-border bg-surface-muted px-3 py-8 text-center transition-colors hover:border-primary hover:bg-primary-subtle/40">
                <ImagePlus className="h-6 w-6 text-text-muted" />
                <span className="text-sm text-text-muted">
                  اضغط لرفع صورة السؤال (JPG / PNG / WebP)
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePickImage}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Options */}
          {type === Q_TYPE.MULTIPLE && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-main">
                الاختيارات <span className="font-normal text-text-muted">(الصح يُعلَّم بعلامة ✓)</span>
              </label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="علامة الإجابة الصحيحة"
                      onClick={() => setOptionCorrect(idx)}
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                        opt.isCorrect
                          ? "border-status-success bg-status-success text-white"
                          : "border-surface-border bg-surface-card text-text-muted hover:bg-surface-muted"
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => setOptionText(idx, e.target.value)}
                      placeholder={`الاختيار ${idx + 1}`}
                      className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* True / False answer */}
          {type === Q_TYPE.TRUE_FALSE && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-main">
                الإجابة الصحيحة
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTfAnswer(true)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    tfAnswer
                      ? "border-status-success bg-status-success-bg text-status-success"
                      : "border-surface-border bg-surface-card text-text-muted hover:bg-surface-muted"
                  }`}
                >
                  صح
                </button>
                <button
                  type="button"
                  onClick={() => setTfAnswer(false)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    !tfAnswer
                      ? "border-status-danger bg-status-danger-bg text-status-danger"
                      : "border-surface-border bg-surface-card text-text-muted hover:bg-surface-muted"
                  }`}
                >
                  غلط
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-surface-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg border border-surface-border bg-surface-card py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-surface-muted"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {saving || uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}