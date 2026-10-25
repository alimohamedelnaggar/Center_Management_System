import { AlertTriangle, Loader2, X } from "@/components/icons";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "تأكيد الحذف",
  message = "هل أنت متأكد من تنفيذ هذا الإجراء؟ لا يمكن التراجع عنه.",
  details = null,
  confirmText = "حذف",
  cancelText = "إلغاء",
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={loading ? null : onClose} />

      <div className="relative bg-surface-card border border-surface-border w-full max-w-md rounded-2xl p-6 shadow-xl z-10 space-y-4">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 left-4 text-text-muted hover:text-text-main p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="p-3 bg-status-danger-bg text-status-danger rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-main">{title}</h3>
            <p className="text-xs text-text-muted mt-0.5">{message}</p>
          </div>
        </div>

        {Array.isArray(details) && details.length > 0 && (
          <div className="p-3 rounded-xl bg-surface-muted border border-surface-border space-y-1.5">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="text-text-muted">{detail.label}</span>
                <span className="font-bold text-text-main">
                  {detail.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:bg-surface-muted transition-colors"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-status-danger text-white hover:opacity-90 flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
