import { useEffect, useState } from "react";
import { Download, FileText, Loader2, NotebookText } from "@/components/icons";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import { PortalEmpty, PortalLoading } from "../../components/portal/PortalUI";
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
    <div data-testid="student-notes-page" className="p-4 font-sans md:p-6">
      <PageHeader
        className="mb-5"
        title="المذكرات"
        subtitle="المذكرات والملفات الخاصة بمجموعاتك"
      />

      {loading && <PortalLoading icon={Loader2} />}

      {!loading && notes.length === 0 && (
        <PortalEmpty icon={NotebookText} title="لا توجد مذكرات متاحة." />
      )}

      {!loading && notes.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <article
              key={note.id}
              className="flex min-w-0 flex-col rounded-card border border-surface-border bg-surface-card p-4 shadow-soft transition hover:border-primary/60 hover:shadow-md"
            >
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-primary-subtle text-primary">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-base font-bold leading-6 text-text-main">
                    {note.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {formatDate(note.createdAt)}
                    {note.fileSize ? ` • ${formatSize(note.fileSize)}` : ""}
                  </p>
                </div>
              </div>

              {note.description && (
                <p className="mb-3 line-clamp-3 text-sm leading-6 text-text-muted">
                  {note.description}
                </p>
              )}

              {note.groupNames?.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {note.groupNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-text-muted"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}

              <Button
                variant="primary"
                block
                className="mt-auto"
                aria-label={`تحميل ${note.title}`}
                onClick={() => handleDownload(note)}
              >
                <Download className="h-4 w-4" />
                تحميل
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
