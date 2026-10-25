import { useEffect, useState } from "react";
import { ChevronDown, LibraryBig, Plus, X } from "@/components/icons";
import toast from "react-hot-toast";
import { questionBankService } from "../../services/questionBankService";

export default function PickQuestionsModal({
  open = false,
  academicYearId = "",
  selectedIds = [],
  onClose,
  onConfirm,
}) {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedBankId, setExpandedBankId] = useState(null);
  const [bankQuestions, setBankQuestions] = useState({});
  const [loadingBankId, setLoadingBankId] = useState(null);
  const [checked, setChecked] = useState({});

  useEffect(() => {
    if (!open) return;
    setChecked({});
    setExpandedBankId(null);
    setBankQuestions({});
    loadBanks();
  }, [open, academicYearId]);

  const loadBanks = async () => {
    try {
      setLoading(true);
      const response = await questionBankService.getBanksPaged({
        pageNumber: 1,
        pageSize: 200,
        academicYearId,
      });

      if (response?.succeeded) {
        setBanks(response.data.data ?? []);
      } else {
        toast.error(response?.message ?? "فشل في تحميل البنوك");
      }
    } catch (error) {
      console.error(error);
      toast.error("فشل في تحميل البنوك");
    } finally {
      setLoading(false);
    }
  };

  const toggleBank = async (bank) => {
    if (expandedBankId === bank.id) {
      setExpandedBankId(null);
      return;
    }

    setExpandedBankId(bank.id);

    if (bankQuestions[bank.id]) return;

    try {
      setLoadingBankId(bank.id);
      const response = await questionBankService.getBankQuestions(bank.id);

      if (response?.succeeded) {
        setBankQuestions((prev) => ({ ...prev, [bank.id]: response.data ?? [] }));
      } else {
        toast.error(response?.message ?? "فشل في تحميل الأسئلة");
      }
    } catch (error) {
      console.error(error);
      toast.error("فشل في تحميل الأسئلة");
    } finally {
      setLoadingBankId(null);
    }
  };

  const toggleQuestion = (question, bank) => {
    setChecked((prev) => {
      const next = { ...prev };
      if (next[question.id]) {
        delete next[question.id];
      } else {
        next[question.id] = { ...question, bankName: bank.name };
      }
      return next;
    });
  };

  if (!open) return null;

  const checkedList = Object.values(checked);
  const alreadySelected = new Set(selectedIds);

  const handleConfirm = () => {
    if (checkedList.length === 0) {
      toast.error("اختر سؤالاً واحداً على الأقل");
      return;
    }
    onConfirm?.(checkedList);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-text-main/40 px-4 font-sans"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-text-main">اختيار الأسئلة</h2>
            <p className="mt-0.5 text-xs text-text-muted">
              اختر الأسئلة من بنوك الأسئلة
            </p>
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

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loading && (
            <p className="py-8 text-center text-sm text-text-muted">جاري التحميل...</p>
          )}

          {!loading && banks.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <LibraryBig className="h-10 w-10 text-text-muted" />
              <p className="text-sm text-text-muted">
                لا توجد بنوك أسئلة لهذه السنة الدراسية.
              </p>
            </div>
          )}

          {!loading &&
            banks.map((bank) => {
              const expanded = expandedBankId === bank.id;
              const questions = bankQuestions[bank.id] ?? [];

              return (
                <div
                  key={bank.id}
                  className="overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleBank(bank)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition-colors hover:bg-surface-muted"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-text-main">
                      <LibraryBig className="h-4 w-4 text-text-muted" />
                      {bank.name}
                      <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-[11px] text-primary">
                        {bank.academicYearName}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-text-muted">
                      {bank.questionsCount} سؤال
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </span>
                  </button>

                  {expanded && (
                    <div className="space-y-2 border-t border-surface-border px-4 py-3">
                      {loadingBankId === bank.id && (
                        <p className="py-3 text-center text-xs text-text-muted">
                          جاري التحميل...
                        </p>
                      )}

                      {loadingBankId !== bank.id && questions.length === 0 && (
                        <p className="py-3 text-center text-xs text-text-muted">
                          لا توجد أسئلة في هذا البنك.
                        </p>
                      )}

                      {questions.map((q) => {
                        const isChecked = !!checked[q.id];
                        const isDisabled = alreadySelected.has(q.id);

                        return (
                          <label
                            key={q.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                              isChecked
                                ? "border-primary bg-primary-subtle"
                                : "border-surface-border bg-surface-card hover:bg-surface-muted"
                            } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked || isDisabled}
                              disabled={isDisabled}
                              onChange={() => toggleQuestion(q, bank)}
                              className="mt-0.5 h-4 w-4 accent-[color:var(--color-primary-val)]"
                            />
                            <span className="flex-1">
                              <span className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                                  {q.typeName}
                                </span>
                                <span className="rounded-full bg-status-success-bg px-2 py-0.5 text-[11px] font-semibold text-status-success">
                                  {q.mark} درجة
                                </span>
                                {isDisabled && (
                                  <span className="rounded-full bg-status-info-bg px-2 py-0.5 text-[11px] font-semibold text-status-info">
                                    مضاف
                                  </span>
                                )}
                              </span>
                              <span className="block text-sm text-text-main">
                                {q.text || "(سؤال بصورة)"}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-surface-border px-5 py-4">
          <span className="text-sm text-text-muted">
            المحدد: <b className="text-text-main">{checkedList.length}</b>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-surface-border bg-surface-card px-4 py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-surface-muted"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              إضافة المحدد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
