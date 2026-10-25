import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Upload, X } from "@/components/icons";

const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx";
const ALLOWED = ["pdf", "doc", "docx", "ppt", "pptx"];

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function extensionOf(name = "") {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export default function StudyNoteModal({ isOpen, onClose, onSave, groups, saving }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setSelectedGroupIds([]);
      setFile(null);
      setError("");
    }
  }, [isOpen]);

  const fileExt = useMemo(() => extensionOf(file?.name), [file]);

  if (!isOpen) return null;

  const toggleGroup = (id) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const handleFile = (selected) => {
    if (!selected) {
      setFile(null);
      return;
    }

    const ext = extensionOf(selected.name);
    if (!ALLOWED.includes(ext)) {
      setError("صيغة الملف غير مدعومة. المسموح: PDF, Word, PowerPoint");
      setFile(null);
      return;
    }

    if (selected.size > 20 * 1024 * 1024) {
      setError("حجم الملف يتجاوز 20 ميجابايت");
      setFile(null);
      return;
    }

    setError("");
    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("عنوان المذكرة مطلوب");
      return;
    }

    if (selectedGroupIds.length === 0) {
      setError("اختر مجموعة واحدة على الأقل");
      return;
    }

    if (!file) {
      setError("الرجاء إرفاق ملف المذكرة");
      return;
    }

    setError("");

    const ok = await onSave({
      title: title.trim(),
      description: description.trim(),
      groupIds: selectedGroupIds,
      file,
    });

    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={saving ? null : onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-border bg-surface-card p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-main">إضافة مذكرة</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1 text-text-muted transition hover:text-text-main"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-text-muted">
              العنوان
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: مذكرة الدرس الأول"
              className="w-full rounded-xl border border-surface-border bg-surface-muted px-3.5 py-2.5 text-sm text-text-main outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-text-muted">
              الوصف (اختياري)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="وصف مختصر للمذكرة..."
              className="w-full resize-none rounded-xl border border-surface-border bg-surface-muted px-3.5 py-2.5 text-sm text-text-main outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-text-muted">
              المجموعات
            </label>
            {groups.length === 0 ? (
              <p className="text-xs text-text-muted">لا توجد مجموعات.</p>
            ) : (
              <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-surface-border bg-surface-muted p-2">
                {groups.map((group) => {
                  const checked = selectedGroupIds.includes(group.id);
                  return (
                    <button
                      type="button"
                      key={group.id}
                      onClick={() => toggleGroup(group.id)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-right text-xs font-medium transition ${
                        checked
                          ? "border-primary bg-primary-subtle text-primary"
                          : "border-surface-border bg-surface-card text-text-main hover:bg-surface-muted"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? "border-primary bg-primary text-white"
                            : "border-surface-border"
                        }`}
                      >
                        {checked && "✓"}
                      </span>
                      <span className="truncate">{group.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-text-muted">
              الملف
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-border bg-surface-muted px-4 py-6 text-center transition hover:border-primary">
              <Upload className="h-6 w-6 text-text-muted" />
              {file ? (
                <span className="flex items-center gap-2 text-sm font-medium text-text-main">
                  <FileText className="h-4 w-4 text-primary" />
                  {file.name}
                  <span className="text-xs text-text-muted">
                    ({formatSize(file.size)})
                  </span>
                </span>
              ) : (
                <span className="text-sm text-text-muted">
                  اختر ملف (PDF, Word, PowerPoint)
                </span>
              )}
              <input
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
            {fileExt && (
              <p className="mt-1 text-[11px] uppercase text-text-muted">
                {fileExt} • الحد الأقصى 20MB
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-status-danger-bg px-3 py-2 text-xs font-medium text-status-danger">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl px-4 py-2.5 text-xs font-bold text-text-muted transition hover:bg-surface-muted"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ وإرسال
          </button>
        </div>
      </form>
    </div>
  );
}
