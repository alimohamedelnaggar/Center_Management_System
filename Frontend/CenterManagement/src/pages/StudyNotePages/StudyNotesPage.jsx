import { useCallback, useEffect, useState } from "react";
import {
  Download,
  FileText,
  Loader2,
  NotebookText,
  Plus,
  Search,
  Trash2,
} from "@/components/icons";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/common/ConfirmModal";
import Pagination from "../../components/common/Pagination";
import { groupsService } from "../../services/groupsService";
import {
  studyNoteFileUrl,
  studyNotesService,
} from "../../services/studyNotesService";
import StudyNoteModal from "./StudyNoteModal";

const PAGE_SIZE = 10;

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("ar-EG", {
      dateStyle: "medium",
    });
  } catch {
    return "-";
  }
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function StudyNotesPage() {
  const [notes, setNotes] = useState([]);
  const [groups, setGroups] = useState([]);

  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadLookups = async () => {
    try {
      const res = await groupsService.getAllGroups();
      if (res?.succeeded) setGroups(res.data ?? []);
    } catch (error) {
      console.error("فشل في تحميل المجموعات", error);
    }
  };

  const loadNotes = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);

        const response = await studyNotesService.getPaged({
          pageNumber: page,
          pageSize: PAGE_SIZE,
          search: search.trim(),
          groupId,
        });

        if (response?.succeeded) {
          setNotes(response.data.data ?? []);
          setCurrentPage(response.data.currentPage);
          setTotalPages(response.data.totalPages);
          setTotalItems(response.data.totalCount);
        } else {
          toast.error(response?.message ?? "فشل في تحميل المذكرات");
        }
      } catch (error) {
        console.error(error);
        toast.error("فشل في تحميل المذكرات");
      } finally {
        setLoading(false);
      }
    },
    [search, groupId],
  );

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadNotes(1), 300);
    return () => clearTimeout(timer);
  }, [loadNotes]);

  const handleSave = async (payload) => {
    try {
      setSaving(true);
      const res = await studyNotesService.create(payload);

      if (res?.succeeded) {
        toast.success(res.message ?? "تم إضافة المذكرة وإرسال الإشعار");
        loadNotes(1);
        return true;
      }

      toast.error(res?.message ?? "فشل في حفظ المذكرة");
      return false;
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ?? "فشل في حفظ المذكرة",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (note) => {
    setSelectedNote(note);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    try {
      setDeleting(true);
      const res = await studyNotesService.delete(selectedNote.id);
      if (res?.succeeded) {
        toast.success(res.message ?? "تم حذف المذكرة");
        setIsDeleteOpen(false);
        setSelectedNote(null);
        loadNotes(currentPage);
      } else {
        toast.error(res?.message ?? "فشل في حذف المذكرة");
      }
    } catch {
      toast.error("فشل في حذف المذكرة");
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = (note) => {
    const url = studyNoteFileUrl(note.fileName);
    if (url) window.open(url, "_blank", "noopener");
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-main">المذكرات</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            ارفع المذكرات وأرسل إشعارًا لمجموعاتك
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          إضافة مذكرة
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بعنوان المذكرة..."
            className="w-full rounded-xl border border-surface-border bg-surface-card py-2.5 pr-10 pl-3.5 text-sm text-text-main outline-none focus:border-primary"
          />
        </div>
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="rounded-xl border border-surface-border bg-surface-card px-3.5 py-2.5 text-sm text-text-main outline-none focus:border-primary"
        >
          <option value="">كل المجموعات</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-surface-muted text-xs text-text-muted">
              <tr>
                <th className="px-4 py-3 font-bold">العنوان</th>
                <th className="px-4 py-3 font-bold">المجموعات</th>
                <th className="px-4 py-3 font-bold">الملف</th>
                <th className="px-4 py-3 font-bold">التاريخ</th>
                <th className="px-4 py-3 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <span className="inline-flex items-center gap-2 text-sm text-text-muted">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      جاري التحميل...
                    </span>
                  </td>
                </tr>
              )}

              {!loading && notes.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <NotebookText className="h-10 w-10 text-text-muted" />
                      <p className="text-sm text-text-muted">
                        لا توجد مذكرات بعد.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                notes.map((note) => (
                  <tr
                    key={note.id}
                    className="border-t border-surface-border transition hover:bg-surface-muted"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-text-main">
                        {note.title}
                      </p>
                      {note.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">
                          {note.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(note.groupNames ?? []).map((name) => (
                          <span
                            key={name}
                            className="rounded-full bg-primary-subtle px-2 py-0.5 text-[11px] font-medium text-primary"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                        <FileText className="h-4 w-4 text-primary" />
                        {formatSize(note.fileSize)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">
                      {formatDate(note.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(note)}
                          title="تحميل"
                          className="rounded-lg p-2 text-primary transition hover:bg-primary-subtle"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNote(note);
                            setIsDeleteOpen(true);
                          }}
                          title="حذف"
                          className="rounded-lg p-2 text-status-danger transition hover:bg-status-danger-bg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!loading && notes.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            name="مذكرة"
            onPageChange={loadNotes}
          />
        )}
      </div>

      <StudyNoteModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        groups={groups}
        saving={saving}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="حذف المذكرة"
        message="هل أنت متأكد من حذف هذه المذكرة؟ سيتم حذف الملف نهائيًا."
        confirmText="حذف"
      />
    </div>
  );
}
