import { useEffect, useState } from "react";
import {
  ClipboardList,
  Clock3,
  Eye,
  Loader2,
  RefreshCw,
  Star,
} from "@/components/icons";
import toast from "react-hot-toast";
import { studentPortalService } from "../../services/studentPortalService";
import StudentExamPreviewModal from "./StudentExamPreviewModal";

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

export default function StudentResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const [previewExam, setPreviewExam] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const loadResults = async () => {
    setLoading(true);
    try {
      const res = await studentPortalService.getResults();
      if (res?.succeeded) {
        setResults(res.data ?? []);
      } else {
        toast.error(res?.message ?? "فشل في تحميل النتائج");
      }
    } catch {
      toast.error("فشل في تحميل النتائج");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  return (
    <div className="p-4 md:p-6 font-sans">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-main">نتائجي</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            درجاتك في الامتحانات الإلكترونية
          </p>
        </div>
        <button
          type="button"
          onClick={loadResults}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-surface-muted"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted text-xs font-semibold text-text-muted">
                <th className="w-12 px-4 py-3">#</th>
                <th className="px-4 py-3">الامتحان</th>
                <th className="px-4 py-3">الدرجة</th>
                <th className="px-4 py-3">النسبة</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                results.map((item, idx) => {
                  const published = Boolean(item.isPublished);
                  const percentage =
                    published && item.totalMark > 0
                      ? Math.round((item.score / item.totalMark) * 100)
                      : 0;

                  return (
                    <tr
                      key={`${item.examId}-${idx}`}
                      className="border-b border-surface-border last:border-0 hover:bg-surface-muted/60"
                    >
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-main">
                          <ClipboardList className="h-4 w-4 text-text-muted" />
                          {item.examName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-text-main">
                        {published ? (
                          <>
                            {item.score} / {item.totalMark}
                          </>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {published ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                              percentage >= 50
                                ? "bg-status-success-bg text-status-success"
                                : "bg-status-danger-bg text-status-danger"
                            }`}
                          >
                            <Star className="h-3.5 w-3.5" />
                            {percentage}%
                          </span>
                        ) : (
                          <span className="text-sm text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-main">
                        {formatDateTime(item.submittedAt)}
                      </td>
                      <td className="px-4 py-3">
                        {!published ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-status-warning-bg px-2.5 py-1 text-xs font-medium text-status-warning">
                            <Clock3 className="h-3.5 w-3.5" />
                            بانتظار النشر
                          </span>
                        ) : item.hasPendingManualGrading ? (
                          <span className="inline-flex rounded-full bg-status-warning-bg px-2.5 py-1 text-xs font-medium text-status-warning">
                            بانتظار تصحيح المقالي
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-status-success-bg px-2.5 py-1 text-xs font-medium text-status-success">
                            مكتمل
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {published && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewExam(item);
                              setIsPreviewOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-subtle px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-text-inverse"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            مراجعة
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

              {!loading && results.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <ClipboardList className="h-10 w-10 text-text-muted" />
                      <p className="text-sm text-text-muted">
                        لا توجد نتائج بعد
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جارٍ التحميل...
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StudentExamPreviewModal
        open={isPreviewOpen}
        exam={previewExam}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewExam(null);
        }}
      />
    </div>
  );
}
