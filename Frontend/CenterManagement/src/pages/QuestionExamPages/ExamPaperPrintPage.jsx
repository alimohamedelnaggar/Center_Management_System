import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Printer } from "@/components/icons";
import toast from "react-hot-toast";
import { questionImageUrl } from "../../services/questionBankService";
import { questionExamService } from "../../services/questionExamService";

const TYPE = { TRUE_FALSE: 1, MULTIPLE: 2, ESSAY: 3 };

export default function ExamPaperPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const printedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await questionExamService.getById(id);

        if (response?.succeeded) {
          setExam(response.data);
        } else {
          toast.error(response?.message ?? "فشل في تحميل الامتحان");
        }
      } catch (error) {
        console.error(error);
        toast.error("فشل في تحميل الامتحان");
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  useEffect(() => {
    if (exam && !printedRef.current) {
      printedRef.current = true;
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
  }, [exam]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg text-sm text-text-muted">
        جاري التحميل...
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface-bg font-sans">
        <p className="text-sm text-text-muted">لا يوجد امتحان لعرضه.</p>
        <button
          type="button"
          onClick={() => navigate("/exams")}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse"
        >
          رجوع للامتحانات
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-bg py-6 font-sans" dir="rtl">
      {/* Toolbar (hidden on print) */}
      <div className="no-print mx-auto mb-4 flex max-w-3xl items-center justify-between px-4">
        <button
          type="button"
          onClick={() => navigate("/exams")}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-surface-muted"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover"
        >
          <Printer className="h-4 w-4" />
          طباعة
        </button>
      </div>

      {/* Paper */}
      <div className="print-area mx-auto w-full max-w-[21cm] bg-white px-8 py-10 text-black shadow-sm">
        {/* Header */}
        <div className="border-b-2 border-black pb-3 text-center">
          <h1 className="text-2xl font-bold">{exam.name}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
            <span>المجموعة: {exam.groupName}</span>
            <span>السنة الدراسية: {exam.academicYearName}</span>
            <span>
              التاريخ: {new Date(exam.examDate).toLocaleDateString("ar-EG")}
            </span>
            <span>
              الدرجة الكلية: {exam.totalMarks} — عدد الأسئلة: {exam.questionsCount}
            </span>
            {exam.mode === 2 && exam.durationMinutes > 0 && (
              <span>المدة: {exam.durationMinutes} دقيقة</span>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-6 text-sm">
          <span>اسم الطالب: ......................................</span>
          <span className="whitespace-nowrap">
            الدرجة: ................ / {exam.totalMarks}
          </span>
        </div>

        {/* Questions */}
        <ol className="mt-6 space-y-5">
          {exam.questions.map((q, index) => (
            <li key={q.id} className="break-inside-avoid">
              <div className="flex items-start gap-2">
                <span className="font-bold">{index + 1})</span>
                <div className="flex-1">
                  {q.text && (
                    <p className="leading-relaxed">{q.text}</p>
                  )}

                  {q.imageName && (
                    <img
                      src={questionImageUrl(q.imageName)}
                      alt=""
                      className="mt-2 max-h-64 border border-black/20 object-contain"
                    />
                  )}

                  {q.type === TYPE.MULTIPLE && q.options?.length > 0 && (
                    <ul className="mt-2 space-y-1 ps-4">
                      {q.options.map((opt, optIdx) => (
                        <li key={opt.id ?? optIdx}>
                          <span className="font-semibold">
                            {String.fromCharCode(65 + optIdx)})
                          </span>{" "}
                          {opt.text}
                        </li>
                      ))}
                    </ul>
                  )}

                  {q.type === TYPE.TRUE_FALSE && (
                    <p className="mt-2">
                      ( &nbsp;&nbsp; ) صح &nbsp;&nbsp;&nbsp;&nbsp; ( &nbsp;&nbsp; ) غلط
                    </p>
                  )}

                  {q.type === TYPE.ESSAY && (
                    <div className="mt-2 space-y-4">
                      <div className="border-b border-dotted border-black/40" />
                      <div className="border-b border-dotted border-black/40" />
                      <div className="border-b border-dotted border-black/40" />
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-xs font-semibold">
                  ({q.mark})
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
