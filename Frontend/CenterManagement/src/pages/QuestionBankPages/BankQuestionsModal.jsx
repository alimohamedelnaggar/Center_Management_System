import { useEffect, useState } from "react";
import { FileQuestion, Pencil, Plus, Trash2, X } from "@/components/icons";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/common/ConfirmModal";
import {
  questionBankService,
  questionImageUrl,
} from "../../services/questionBankService";
import QuestionModal from "./QuestionModal";

export default function BankQuestionsModal({ open = false, bank = null, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadQuestions = async () => {
    if (!bank) return;

    try {
      setLoading(true);
      const response = await questionBankService.getBankQuestions(bank.id);

      if (response?.succeeded) {
        setQuestions(response.data ?? []);
      } else {
        toast.error(response?.message ?? "فشل في تحميل الأسئلة");
      }
    } catch (error) {
      console.error(error);
      toast.error("فشل في تحميل الأسئلة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && bank) {
      setQuestions([]);
      loadQuestions();
    }
  }, [open, bank?.id]);

  if (!open || !bank) return null;

  const openAddQuestion = () => {
    setEditingQuestion(null);
    setShowQuestionModal(true);
  };

  const openEditQuestion = (question) => {
    setEditingQuestion(question);
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async (data) => {
    try {
      const response = editingQuestion
        ? await questionBankService.updateQuestion({
            id: editingQuestion.id,
            ...data,
          })
        : await questionBankService.addQuestion({
            questionBankId: bank.id,
            ...data,
          });

      if (response?.succeeded) {
        toast.success(
          response.message ??
            (editingQuestion ? "تم تعديل السؤال بنجاح" : "تم إضافة السؤال بنجاح"),
        );
        setShowQuestionModal(false);
        loadQuestions();
      } else {
        toast.error(response?.message ?? "حدث خطأ ما");
      }
    } catch (error) {
      console.error("فشل في حفظ السؤال", error);
      toast.error("حدث خطأ ما");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedQuestion) return;

    try {
      setDeleting(true);
      const response = await questionBankService.deleteQuestion(selectedQuestion.id);

      if (response?.succeeded) {
        toast.success(response.message ?? "تم حذف السؤال بنجاح");
        setQuestions((prev) => prev.filter((q) => q.id !== selectedQuestion.id));
      } else {
        toast.error(response?.message ?? "فشل في حذف السؤال");
      }

      setIsDeleteOpen(false);
      setSelectedQuestion(null);
    } catch (error) {
      console.error("فشل في حذف السؤال", error);
      toast.error("فشل في حذف السؤال");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/40 px-4 font-sans"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-text-main">{bank.name}</h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {questions.length} سؤال
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openAddQuestion}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              إضافة سؤال
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loading && (
            <p className="py-8 text-center text-sm text-text-muted">جاري التحميل...</p>
          )}

          {!loading && questions.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <FileQuestion className="h-10 w-10 text-text-muted" />
              <p className="text-sm text-text-muted">
                لا توجد أسئلة في هذا البنك بعد، أضف أول سؤال.
              </p>
            </div>
          )}

          {!loading &&
            questions.map((q) => (
              <div
                key={q.id}
                className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-primary-subtle px-2.5 py-1 text-[11px] font-semibold text-primary">
                      {q.typeName}
                    </span>
                    <span className="inline-flex rounded-full bg-status-success-bg px-2.5 py-1 text-[11px] font-semibold text-status-success">
                      {q.mark} درجة
                    </span>
                    {q.text && (
                      <p className="text-sm font-medium leading-relaxed text-text-main">
                        {q.text}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="تعديل"
                      onClick={() => openEditQuestion(q)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary transition-colors hover:bg-primary hover:text-text-inverse"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="حذف"
                      onClick={() => {
                        setSelectedQuestion(q);
                        setIsDeleteOpen(true);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-status-danger-bg text-status-danger transition-colors hover:bg-status-danger hover:text-text-inverse"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {q.imageName && (
                  <img
                    src={questionImageUrl(q.imageName)}
                    alt="السؤال"
                    className="mb-2 max-h-56 rounded-lg border border-surface-border bg-surface-muted object-contain"
                  />
                )}

                {q.options?.length > 0 && (
                  <ol className="mt-2 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                    {q.options.map((opt, idx) => (
                      <li
                        key={opt.id ?? idx}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                          opt.isCorrect
                            ? "bg-status-success-bg text-status-success"
                            : "bg-surface-muted text-text-main"
                        }`}
                      >
                        <span className="font-bold">
                          {q.type === 2 ? `${String.fromCharCode(65 + idx)})` : ""}
                        </span>
                        <span>{opt.text}</span>
                        {opt.isCorrect && (
                          <span className="ms-auto text-[11px] font-semibold">
                            ✓ الإجابة الصحيحة
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
        </div>

        <QuestionModal
          open={showQuestionModal}
          question={editingQuestion}
          onClose={() => setShowQuestionModal(false)}
          onSave={handleSaveQuestion}
        />

        <ConfirmModal
          isOpen={isDeleteOpen}
          onClose={() => {
            setIsDeleteOpen(false);
            setSelectedQuestion(null);
          }}
          onConfirm={handleDeleteConfirm}
          loading={deleting}
          title="حذف السؤال"
          message="هل أنت متأكد من حذف هذا السؤال؟"
          confirmText="حذف"
          cancelText="إلغاء"
        />
      </div>
    </div>
  );
}