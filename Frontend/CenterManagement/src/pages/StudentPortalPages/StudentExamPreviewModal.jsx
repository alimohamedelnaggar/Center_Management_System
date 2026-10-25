import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  ImageIcon,
  Loader2,
  Printer,
  Star,
  X,
  XCircle,
} from "@/components/icons";
import toast from "react-hot-toast";
import { questionImageUrl } from "../../services/questionBankService";
import { studentPortalService } from "../../services/studentPortalService";

const ESSAY = 3;

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

export default function StudentExamPreviewModal({ open = false, exam = null, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !exam?.examId) return;

    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const response = await studentPortalService.getExamPreview(exam.examId);
        if (!active) return;
        if (response?.succeeded) {
          setData(response.data);
        } else {
          setData(null);
          toast.error(response?.message ?? "فشل في تحميل مراجعة الامتحان");
        }
      } catch {
        if (!active) return;
        setData(null);
        toast.error("فشل في تحميل مراجعة الامتحان");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [open, exam?.examId]);

  if (!open) return null;

  const percentage =
    data && data.totalMark > 0
      ? Math.round((data.score / data.totalMark) * 100)
      : 0;

  const handlePrint = () => {
    if (!data) return;

    const essay = 3;
    const examName = exam?.examName ?? data.examName ?? "نتيجة الامتحان";
    const score = data.score ?? 0;
    const total = data.totalMark ?? 0;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;

    const escape = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const rows = data.questions
      .map((q) => {
        const isEssay = q.type === essay;
        const correctOption = q.options.find((o) => o.isCorrect);
        const selectedOption = q.options.find((o) => o.id === q.selectedOptionId);

        let answerHtml = "";
        if (isEssay) {
          answerHtml = `<div class="answer">${
            q.essayAnswer?.trim() ? escape(q.essayAnswer) : "لم تُجب"
          }</div>`;
        } else {
          answerHtml = q.options
            .map((o) => {
              const tags = [];
              if (o.isCorrect) tags.push('<span class="ok">صحيحة</span>');
              if (o.id === q.selectedOptionId)
                tags.push('<span class="sel">إجابتك</span>');
              return `<div class="opt">${escape(o.text)} ${tags.join(" ")}</div>`;
            })
            .join("");
        }

        const correctness = isEssay
          ? ""
          : q.isCorrect
            ? '<span class="ok">صحيح</span>'
            : '<span class="bad">خطأ</span>';

        return `
          <div class="q">
            <div class="qhead">
              <strong>سؤال ${q.order}</strong>
              <span>${escape(q.typeName)}</span>
              <span>${q.awardedMark} / ${q.mark}</span>
              ${correctness}
            </div>
            <div class="qtext">${escape(q.text) || "(سؤال بصورة)"}</div>
            ${answerHtml}
            ${
              !isEssay && !correctOption
                ? '<div class="muted">لا توجد إجابة صحيحة محددة</div>'
                : ""
            }
          </div>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>${escape(examName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Tahoma, sans-serif; margin: 24px; color: #1f2937; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
  .summary { display: flex; gap: 16px; margin-bottom: 20px; padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 10px; }
  .summary span { font-weight: 700; }
  .q { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; page-break-inside: avoid; }
  .qhead { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; color: #6b7280; margin-bottom: 8px; }
  .qtext { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
  .opt { border: 1px solid #eef0f2; border-radius: 8px; padding: 6px 10px; margin-bottom: 6px; font-size: 13px; }
  .answer { white-space: pre-wrap; background: #f9fafb; border-radius: 8px; padding: 8px 10px; font-size: 13px; }
  .ok { color: #15803d; font-weight: 700; }
  .bad { color: #b91c1c; font-weight: 700; }
  .sel { color: #1d4ed8; font-weight: 700; }
  .muted { color: #9ca3af; font-size: 12px; margin-top: 6px; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
  <h1>${escape(examName)}</h1>
  <div class="meta">تاريخ التسليم: ${escape(formatDateTime(data.submittedAt))}</div>
  <div class="summary">
    <span>الدرجة: ${score} / ${total}</span>
    <span>النسبة: ${pct}%</span>
  </div>
  ${rows}
</body>
</html>`;

    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) {
      toast.error("تعذّر فتح نافذة الطباعة");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-surface-border bg-surface-card shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-surface-border p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-subtle text-primary">
              <ClipboardList className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-base font-bold text-text-main">
                مراجعة الامتحان
              </h3>
              <p className="text-xs text-text-muted">
                {exam?.examName ?? data?.examName}
              </p>
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

        {!loading && data && (
          <div className="flex flex-wrap items-center gap-4 border-b border-surface-border px-5 py-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-subtle px-3 py-1 font-bold text-primary">
              <Star className="h-3.5 w-3.5" />
              {data.score} / {data.totalMark}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-bold ${
                percentage >= 50
                  ? "bg-status-success-bg text-status-success"
                  : "bg-status-danger-bg text-status-danger"
              }`}
            >
              {percentage}%
            </span>
            <span className="text-text-muted">
              تاريخ التسليم: {formatDateTime(data.submittedAt)}
            </span>
            {data.hasPendingManualGrading && (
              <span className="rounded-full bg-status-warning-bg px-3 py-1 font-medium text-status-warning">
                توجد أسئلة مقالية بانتظار التصحيح
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-12 text-text-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {!loading && data && (
            <div className="space-y-4">
              {data.questions.map((q) => {
                const isEssay = q.type === ESSAY;
                const correctOption = q.options.find((o) => o.isCorrect);

                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-surface-border bg-surface-card p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-primary">
                        {q.order}
                      </span>
                      <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-medium text-text-muted">
                        {q.typeName}
                      </span>
                      <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-medium text-text-muted">
                        {q.awardedMark} / {q.mark}
                      </span>
                      {!isEssay &&
                        (q.isCorrect ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-status-success-bg px-2.5 py-0.5 text-[11px] font-bold text-status-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            صحيح
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-status-danger-bg px-2.5 py-0.5 text-[11px] font-bold text-status-danger">
                            <XCircle className="h-3.5 w-3.5" />
                            خطأ
                          </span>
                        ))}
                    </div>

                    {q.text && (
                      <p className="mb-2 text-sm font-medium text-text-main">
                        {q.text}
                      </p>
                    )}

                    {q.imageName && (
                      <img
                        src={questionImageUrl(q.imageName)}
                        alt="صورة السؤال"
                        className="mb-3 max-h-56 rounded-lg border border-surface-border object-contain"
                      />
                    )}

                    {isEssay ? (
                      <div className="space-y-2">
                        <div className="rounded-lg border border-surface-border bg-surface-muted/60 p-3">
                          <p className="mb-1 text-[11px] font-bold text-text-muted">
                            إجابتك
                          </p>
                          <p className="whitespace-pre-wrap text-sm text-text-main">
                            {q.essayAnswer?.trim()
                              ? q.essayAnswer
                              : "لم تُجب على هذا السؤال"}
                          </p>
                        </div>
                        {data.hasPendingManualGrading &&
                          q.awardedMark === 0 && (
                            <span className="text-[11px] text-status-warning">
                              بانتظار تصحيح المدرس
                            </span>
                          )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {q.options.map((option) => {
                          const isSelected = q.selectedOptionId === option.id;
                          const isCorrect = option.isCorrect;

                          let wrapper =
                            "border-surface-border bg-surface-card";
                          if (isCorrect) {
                            wrapper =
                              "border-status-success bg-status-success-bg";
                          } else if (isSelected) {
                            wrapper =
                              "border-status-danger bg-status-danger-bg";
                          }

                          return (
                            <div
                              key={option.id}
                              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${wrapper}`}
                            >
                              <span className="text-text-main">
                                {option.text}
                              </span>
                              <span className="flex items-center gap-1.5">
                                {isSelected && (
                                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-text-inverse">
                                    إجابتك
                                  </span>
                                )}
                                {isCorrect && (
                                  <CheckCircle2 className="h-4 w-4 text-status-success" />
                                )}
                              </span>
                            </div>
                          );
                        })}
                        {!correctOption && (
                          <p className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                            <ImageIcon className="h-3.5 w-3.5" />
                            لا توجد إجابة صحيحة محددة لهذا السؤال
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-surface-border p-4">
          <button
            type="button"
            onClick={handlePrint}
            disabled={!data || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-card px-4 py-2.5 text-xs font-bold text-text-main transition-colors hover:bg-surface-muted disabled:opacity-60"
          >
            <Printer className="h-4 w-4" />
            طباعة / PDF
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
    </div>
  );
}
