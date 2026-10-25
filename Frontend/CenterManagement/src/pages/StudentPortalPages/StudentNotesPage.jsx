import { useEffect, useState } from "react";
import { Download, FileText, Loader2, NotebookText } from "@/components/icons";
import toast from "react-hot-toast";
import { studentPortalService } from "../../services/studentPortalService";
import { studyNoteFileUrl } from "../../services/studyNotesService";

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("ar-EG", {
      dateStyle: "medium",
    });
  } catch {
    return "";
  }
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function StudentNotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await studentPortalService.getNotes();
        if (!active) return;
        if (res?.succeeded) {
          setNotes(res.data ?? []);
        } else {
          toast.error(res?.message ?? "فشل في تحميل المذكرات");
        }
      } catch {
        if (active) toast.error("فشل في تحميل المذكرات");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const handleDownload = (note) => {
    const url = studyNoteFileUrl(note.fileName);
    if (url) window.open(url, "_blank", "noopener");
  };

  return (
    <div className="p-4 md:p-6 font-sans">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-text-main">المذكرات</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          المذكرات والملفات الخاصة بمجموعاتك
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري التحميل...
        </div>
      )}

      {!loading && notes.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-surface-border bg-surface-card py-16 text-center shadow-sm">
          <NotebookText className="h-10 w-10 text-text-muted" />
          <p className="text-sm text-text-muted">لا توجد مذكرات متاحة.</p>
        </div>
      )}

      {!loading && notes.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex flex-col rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-text-main">
                    {note.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    {formatDate(note.createdAt)}
                    {note.fileSize ? ` • ${formatSize(note.fileSize)}` : ""}
                  </p>
                </div>
              </div>

              {note.description && (
                <p className="mb-3 line-clamp-2 text-sm text-text-muted">
                  {note.description}
                </p>
              )}

              {note.groupNames?.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {note.groupNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-muted"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => handleDownload(note)}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                تحميل
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
