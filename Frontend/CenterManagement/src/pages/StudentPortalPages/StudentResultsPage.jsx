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
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import {
  PortalEmpty,
  PortalLoading,
  PortalStatus,
} from "../../components/portal/PortalUI";
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

function statusTone(item) {
  if (!item.isPublished) return "warning";
  if (item.hasPendingManualGrading) return "warning";
  return "success";
}

function statusLabel(item) {
  if (!item.isPublished) return "بانتظار النشر";
  if (item.hasPendingManualGrading) return "بانتظار تصحيح المقالي";
  return "مكتمل";
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

  const openPreview = (item) => {
    setPreviewExam(item);
    setIsPreviewOpen(true);
  };

  return (
    <div data-testid="student-results-page" className="p-4 font-sans md:p-6">
      <PageHeader
        className="mb-5"
        title="نتائجي"
        subtitle="درجاتك في الامتحانات الإلكترونية"
        actions={
          <Button variant="secondary" onClick={loadResults} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        }
      />

      {loading && <PortalLoading icon={Loader2} />}

      {!loading && results.length === 0 && (
        <PortalEmpty icon={ClipboardList} title="لا توجد نتائج بعد" />
      )}

      {!loading && results.length > 0 && (
        <>
          {/* Phone: one card per result, readable at arm's length. */}
          <div className="grid gap-3 lg:hidden">
            {results.map((item, idx) => {
              const published = Boolean(item.isPublished);
              const percentage =
                published && item.totalMark > 0
                  ? Math.round((item.score / item.totalMark) * 100)
                  : 0;

              return (
                <article
                  key={`${item.examId}-${idx}`}
                  data-testid="student-result-card"
                  className="rounded-card border border-surface-border bg-surface-card p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-base font-bold text-text-main">
                        {item.examName}
                      </h2>
                      <p className="mt-1 text-xs text-text-muted">
                        {formatDateTime(item.submittedAt)}
                      </p>
                    </div>
                    <PortalStatus tone={statusTone(item)}>
                      {statusLabel(item)}
                    </PortalStatus>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-text-muted">الدرجة</p>
                      <p className="mt-0.5 text-3xl font-extrabold leading-none tabular-nums text-text-main">
                        {published ? item.score : "—"}
                        {published && (
                          <span className="text-base font-bold text-text-muted">
                            {" / "}
                            {item.totalMark}
                          </span>
                        )}
                      </p>
                    </div>
                    {published && (
                      <PortalStatus tone={percentage >= 50 ? "success" : "danger"}>
                        <Star className="h-3.5 w-3.5" />
                        {percentage}%
                      </PortalStatus>
                    )}
                  </div>

                  {published && (
                    <Button
                      variant="soft"
                      size="sm"
                      block
                      className="mt-4"
                      onClick={() => openPreview(item)}
                    >
                      <Eye className="h-4 w-4" />
                      مراجعة
                    </Button>
                  )}
                </article>
              );
            })}
          </div>

          {/* Tablet and desktop: the same rows in a table. */}
          <div className="hidden overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-soft lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted text-sm font-semibold text-text-muted">
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
                  {results.map((item, idx) => {
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
                        <td className="px-4 py-3 text-sm font-semibold tabular-nums text-text-main">
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
                            <PortalStatus tone={percentage >= 50 ? "success" : "danger"}>
                              <Star className="h-3.5 w-3.5" />
                              {percentage}%
                            </PortalStatus>
                          ) : (
                            <span className="text-sm text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-main">
                          {formatDateTime(item.submittedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <PortalStatus tone={statusTone(item)}>
                            {!item.isPublished && <Clock3 className="h-3.5 w-3.5" />}
                            {statusLabel(item)}
                          </PortalStatus>
                        </td>
                        <td className="px-4 py-3">
                          {published && (
                            <Button
                              variant="soft"
                              size="sm"
                              onClick={() => openPreview(item)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              مراجعة
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

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
